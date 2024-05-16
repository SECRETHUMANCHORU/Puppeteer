const express = require('express');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const router = express.Router();

router.get('/', async (req, res) => {
  const { user, pass, text } = req.query;

  if (!user || !pass || !text) {
    return res.status(400).send('Missing user, pass, or text query parameter');
  }

  freeport(async (err, port) => {
    if (err) {
      console.error('Error finding free port:', err);
      return res.status(500).send('Error finding free port');
    }

    const proxyServer = new ProxyChain.Server({ port });

    proxyServer.listen(async () => {
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
        ]
      });

      const page = await browser.newPage();

      await page.setUserAgent("Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7;en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17");
      await page.goto('https://aternos.org/go/');

      await page.type('.username', user, { delay: 100 });
      await page.type('.password', pass, { delay: 100 });
      await page.click('.login-button');

      await page.waitForSelector('.server-body');
      await page.click('.server-body');
    await page.waitForNavigation();
      await page.goto('https://aternos.org/players/allowlist');
  

      const playerNames = await page.evaluate(() => {
        const players = document.querySelectorAll('.list-name');
        return Array.from(players).map(player => player.textContent.trim());
      });

      if (playerNames.includes(text)) {
        res.json("User is already");
        await browser.close();
        proxyServer.close(() => {
          console.log('Proxy server closed');
        });
        return;
      }
      
try {
  await page.waitForSelector('#list-input');
  await page.type('#list-input', text, { delay: 100 });
  await page.waitForTimeout(10000);
} catch (error) {
  res.json("Server is offline");
  await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });
  return; 
}    
      await page.click('.btn.btn-small.btn-white');

      res.json(`Success add ${text}`);

      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });
    });
  });
});

module.exports = router;
