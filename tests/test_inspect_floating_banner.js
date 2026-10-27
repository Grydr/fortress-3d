import puppeteer from 'puppeteer';

async function inspectBanner() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/firefox',
    browser: 'firefox',
    headless: true,
    args: ['--no-remote'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 15000 });

  await page.click('#btn-start-game');
  await new Promise((r) => setTimeout(r, 600));

  await page.evaluate(() => {
    const app = window.gameApp;
    // Banner 1 is at x: 14 * 3 = 42, z: 8.95 * 3 = 26.85.
    // Let's place player at (42, 1.6, 32) looking North towards z = 26.85
    app.player.position.set(42, 1.6, 32);
    app.player.camera.position.set(42, 1.6, 32);
    app.player.yaw = Math.PI; // Face North (-Z)
    app.player.pitch = 0;
    app.player.camera.rotation.set(0, Math.PI, 0);
  });

  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: '/tmp/floating_banner_view.png' });

  await browser.close();
  console.log('Floating banner screenshot captured');
}

inspectBanner().catch(console.error);
