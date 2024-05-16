const express = require('express');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const router = express.Router();

router.get('/', async (req, res) => {
  const { prompt, user } = req.query;

  if (!prompt || !user) {
    return res.status(400).send('Missing prompt & user query parameter');
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

      const cookies = JSON.parse(fs.readFileSync('cookies-pi.json', 'utf8'));

      // Set cookies
      await page.setCookie(...cookies);

      await page.goto('https://pi.ai', { waitUntil: 'networkidle2' });

    
      
     await page.waitForSelector('.t-body-chat'),
       await page.type('.t-body-chat', `Don't call me by my name "Joker". Just call me ${user}, alright? Just a friendly reminder. Here's my message: "${prompt}"`),
     await page.waitForSelector('.bg-primary-600'),
       await page.click('.bg-primary-600')
      


      // Wait for the response
      await page.waitForTimeout(5000);


      const response = await page.evaluate(() => {
        const elements = document.querySelectorAll('.whitespace-pre-wrap');
        let textContent = '';
        elements.forEach(element => {
          textContent += element.textContent.trim() + '\n';
        });

        const match = textContent.match(/(\n.*\n\n)$/);
        const lastText = match ? match[1] : '';

        return lastText.trim();
      });

      console.log(response);

      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });
      res.json({ website: "https://pi.ai", result: response });
    });
  });
});

module.exports = router;