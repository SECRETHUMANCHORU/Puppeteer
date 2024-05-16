const express = require('express');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');

const router = express.Router();

router.get('/', async (req, res) => {
  const { user, pass, text } = req.query;

  if (!user || !pass || !text ) {
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

      await page.waitForSelector('.server-body');
      await page.click('.server-body');

      await page.waitForNavigation(); // Wait for the navigation to complete
      await page.goto('https://aternos.org/console/');
      try {
await page.type('#c-input', `/say §9[ VentureSmp ] §a${text}`);

  await page.keyboard.press('Enter');
      } catch (error) {
        res.json("Server is offline");
        await browser.close();
        proxyServer.close(() => {
          console.log('Proxy server closed');
        });
        return; 
      }

      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });

      res.json("Success");
    });
  });
});

module.exports = router;
