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

  try {
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

        await page.goto('https://ssstik.io/', { waitUntil: 'networkidle2' });
        await page.waitForSelector('#main_page_text');
        await page.type('#main_page_text', link);
        await page.click('#submit');
        await page.waitForTimeout(3000);

        const text = await page.$eval('.maintext', el => el.textContent);
        const downloadLink = await page.$eval('.download_link', el => el.getAttribute('href'));

        console.log('Text:', text);
        console.log('Download Link:', downloadLink);

        await browser.close();
        proxyServer.close(() => {
          console.log('Proxy server closed');
        });

        res.send({ website: "https://ssstik.io", text, downloadLink });
      });
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
