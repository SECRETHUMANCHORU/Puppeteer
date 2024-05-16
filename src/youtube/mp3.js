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

      await page.goto('https://www.easymp3converter.org/', { waitUntil: 'networkidle2' });

      // Block ads
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

      await page.type('input#search_txt', link);
      await page.click('button#btn-submit');
      await page.waitForSelector('button#btn-download');
      await page.click('button#btn-download');

      
      await page.waitForSelector('a#downloadbtn');
      const downloadLink = await page.evaluate(() => {
        const downloadBtn = document.querySelector('a#downloadbtn');
        return downloadBtn.href;
      });
      const text = await page.evaluate(() => {
        const element = document.querySelector('h5.media-heading');
        return element.textContent.trim();
      });


      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });
      res.json({ website: "https://www.easymp3converter.org", title: text, result: downloadLink });
    });
  });
});

module.exports = router;
