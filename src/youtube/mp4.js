const express = require('express');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');

const router = express.Router();

router.get('/', async (req, res) => {
  const { link } = req.query;

  if (!link) {
    return res.status(400).send('Missing link query parameter');
  }

  freeport(async (err, port) => {
    if (err) {
      console.error('Error finding free port:', err);
      return res.status(500).send('Error finding free port');
    }

    const proxyServer = new ProxyChain.Server({ port });

    proxyServer.listen(async () => {
      console.log(`Proxy server listening on port ${port}`);

      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        ignoreHTTPSErrors: true,
        args: [
          '--ignore-certificate-errors',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          `--proxy-server=127.0.0.1:${port}`
        ],
      });

      const page = await browser.newPage();

      await page.setUserAgent("Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7;en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17");

      await page.goto("https://10downloader.com/en/121/youtube-to-mp4-converter", { waitUntil: 'networkidle2' });
      
      await page.evaluate(() => {
        const adSelectors = [
          'div.ad',
          'iframe[src*="ads"]'
        ];
        adSelectors.forEach(selector => {
          const ads = document.querySelectorAll(selector);
          ads.forEach(ad => {
            ad.remove();
          });
        });
      });
      
      await page.waitForSelector('input#video_url');
      await page.type('input#video_url', link);
      
      await page.click('.btn__search');

      await page.waitForSelector('.downloadBtn');
      const downloadLink = await page.evaluate(() => {
        const downloadBtn = document.querySelector('.downloadBtn');
        return downloadBtn.getAttribute('href');
      });

const text = await page.evaluate(() => {
  const element = document.querySelector('.title');
  return element.textContent;
});
      
      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });

      
      res.json({ website: "https://10downloader.com/en/121/youtube-to-mp4-converter",  title: text, result: downloadLink });
    });
  });
});

module.exports = router;
