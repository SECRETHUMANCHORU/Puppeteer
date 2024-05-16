const express = require('express');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');

const router = express.Router();

router.get('/', async (req, res) => {
  const { user, pass } = req.query;

  if (!user || !pass) {
    return res.status(400).send('Missing user or pass query parameter');
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
        ]
      });

      const page = await browser.newPage();

      await page.setUserAgent("Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7;en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17");
      await page.goto('https://aternos.org/go/');

      await page.type('.username', user, { delay: 100 });
      await page.type('.password', pass, { delay: 100 });
      await page.click('.login-button');
await page.waitForNavigation();
      await page.waitForSelector('.server-body');
      await page.click('.server-body');

      await Promise.all([
        page.waitForSelector('#share-url'),
        page.waitForSelector('#start')
      ]);

      const onlineStatus = await page.evaluate(() => {
        const statusLabel = document.querySelector('.statuslabel-label');
        return statusLabel ? statusLabel.textContent.trim() : '';
      });

      let results = {};

      if (onlineStatus === 'Online') {
        results = await page.evaluate(() => {
          const shareUrl = document.querySelector('#share-url')?.textContent.trim() || null;
          const address = document.querySelector('#ip')?.textContent.trim() || null;
          const portNumber = document.querySelector('#port')?.textContent.trim() || null;
          const software = document.querySelector('#software')?.textContent.trim() || null;
          const version = document.querySelector('#version')?.textContent.trim() || null;

          const serverCountdown = (document.querySelector('.server-end-countdown')?.textContent.trim()) || "✓";


          return {
            shareUrl,
            address,
            portNumber,
            software,
            version,
            serverCountdown:  serverCountdown
          };
        });
      } else {
        results = await page.evaluate(() => {
          const shareUrl = document.querySelector('#share-url')?.textContent.trim() || null;
          const address = document.querySelector('#ip')?.textContent.trim() || null;
          const portNumber = document.querySelector('#port')?.textContent.trim() || null;
          const software = document.querySelector('#software')?.textContent.trim() || null;
          const version = document.querySelector('#version')?.textContent.trim() || null;


          return {
            shareUrl,
            address,
            portNumber,
            software,
            version,
            serverCountdown: 'Server will be on'
          };
        });

        try {
          await page.focus('#start');
          await page.click('#start');
          await page.waitForTimeout(10000);
        } catch (error) {
          res.json({
            shareUrl,
            address,
            portNumber,
            software,
            version,
            serverCountdown: 'Wait Try Again If Delay'
          })
        }
      }

      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });

      res.json(results);
    });
  });
});

module.exports = router;
