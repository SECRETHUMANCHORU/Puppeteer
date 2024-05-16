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

      try {
        await page.goto('https://www.facebook.com/profile.php?id=100088806220727');
        await page.waitForTimeout(5000);

        // Scrape elements
        const followingTotal = await page.evaluate(() => {
          const followingElem = document.querySelector('[data-action-id="32286"] .f2');
          return followingElem ? followingElem.textContent.trim() : null;
        });

        const followersTotal = await page.evaluate(() => {
          const followersElem = document.querySelector('[data-action-id="32287"] .f2');
          return followersElem ? followersElem.textContent.trim() : null;
        });

        const name = await page.evaluate(() => {
          const nameElem = document.querySelector('[data-action-id="32708"]');
          return nameElem ? nameElem.textContent.trim() : null;
        });

        const description = await page.evaluate(() => {
          const descriptionElem = document.querySelector('[data-comp-id="3"] [style="color:#050505;"]');
          return descriptionElem ? descriptionElem.textContent.trim() : null;
        });

        console.log('Following:', followingTotal);
        console.log('Followers:', followersTotal);
        console.log('Name:', name);
        console.log('Description:', description);
      } catch (error) {
        console.error('Error scraping data:', error);
      } finally {
        await browser.close();
        proxyServer.close(() => {
          console.log('Proxy server closed');
        });

        res.json({
          done: "ok"
        });
      }
    });
  });
});

module.exports = router;
