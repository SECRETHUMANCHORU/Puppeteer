const express = require('express');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');

const router = express.Router();

router.get('/', async (req, res) => {
  const { prompt } = req.query;

  if (!prompt) {
    return res.status(400).send('Missing prompt query parameter');
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

      await page.goto('https://chatgptdemo.ai/chat/', { waitUntil: 'networkidle2' });
      await page.waitForSelector('.wpaicg-chatbox-clear-btn');
await page.click('.wpaicg-chatbox-clear-btn');
await page.waitForTimeout(2000);
      await page.type('.auto-expand', prompt);

      await page.click('.feather-send');

      await page.waitForSelector('.wpaicg-chat-message');
      
      const message = await page.evaluate(() => {
        return document.querySelector('.wpaicg-chat-message').innerText;
      });
      res.json({website: "https://chatgpt.com", result: message})

      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });
    });
  });
});

module.exports = router;
