const express = require('express');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');

const router = express.Router();

router.get('/', async (req, res) => {
  freeport(async (err, port) => {
    if (err) {
      console.error('Error finding free port:', err);
      return res.status(500).send('Error finding free port');
    }

    const proxyServer = new ProxyChain.Server({ port });

    proxyServer.listen(async () => {
      console.log(`Proxy server listening on port ${port}`);

      const browser = await puppeteer.launch({
        headless: false,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        ignoreHTTPSErrors: true,
        args: [
          '--ignore-certificate-errors',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          `--proxy-server=127.0.0.1:${port}`,
        ],
      });

      const page = await browser.newPage();

      await page.setUserAgent("Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7;en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17");

      await page.goto('https://www.gmanetwork.com/');

      const newsElement = await page.$('.latest-site=NEWS');
      const newsText = await newsElement.evaluate(element => element.textContent.trim());
      const newsLink = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.src : '';
      });

      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });

      res.json({
        news: newsText,
        link: newsLink
      });
    });
  });
});

module.exports = router;
