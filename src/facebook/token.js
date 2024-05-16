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

      await page.goto('https://m.facebook.com/');

      await page.waitForSelector('#m_login_email');
      await page.type('#m_login_email', '61551747232322');
      await page.type('#m_login_password', 'facebookmessengerai');
      await page.click('button[name="login"]');

      await page.waitForNavigation();

      // Get cookies
      const cookies = await page.cookies();

      // Navigate to the Ads Manager dashboard
      await page.goto('https://www.facebook.com/adsmanager/');

      // Wait for the page to load
      await page.waitForNavigation();

      const adAccountIdMatch = /adAccountId": \\"([\d]+)\\"\\n/gm.exec(
        await page.content()
      );
      const adAccountId = adAccountIdMatch ? adAccountIdMatch[1] : null;

      if (!adAccountId) {
        console.error('Ad Account ID not found');
        await browser.close();
        return;
      }

      await page.waitForNavigation();
      await page.goto(`https://www.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}`);

      const access_tokenMatch = /__accessToken="([^"]+)"/gm.exec(
        await page.content()
      );
      const access_token = access_tokenMatch ? access_tokenMatch[1] : null;

      if (!access_token) {
        console.error('Access token not found')
        return;
      }

      console.log('Access token:', access_token);

      await page.waitForTimeout(5000);

      await browser.close();
      proxyServer.close(() => {
        console.log('Proxy server closed');
      });

      res.json({
        cookies,
        done: "ok"
      });
    });
  });
});

module.exports = router;
