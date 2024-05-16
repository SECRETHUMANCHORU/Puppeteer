const express = require('express');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
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
   const cookies = JSON.parse(fs.readFileSync('cookies-ai.json', 'utf8'));

      // Set cookies
      await page.setCookie(...cookies);
      await page.goto('https://chatgpt.com/', { waitUntil: 'networkidle2' });
     /* for (let i = 0; i < 3; i++) {
        await page.reload();
      }*/
      await page.waitForSelector('#prompt-textarea');
      await page.type('#prompt-textarea', prompt);
      await page.waitForSelector('.text-white.dark\\:text-black');
      await page.click('.text-white.dark\\:text-black');
      
      await page.waitForSelector('.text-gray-400.flex.self-end.lg\\:self-center.items-center.justify-center.lg\\:justify-start.mt-0.-ml-1.h-7.gap-\\[2px\\].visible');
      await page.waitForTimeout(2000);

      const response = await page.$eval('.prose', el => {
        let text = el.textContent.trim();

        text = text.replace(/\.(\S)/g, '. $1');
        text = text.replace(/\b(\S+):/g, '\n$1:');
        return { website: "https://chat.openai.com", text };
      });

      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });

      res.json(response);
    });
  });
});

module.exports = router;
