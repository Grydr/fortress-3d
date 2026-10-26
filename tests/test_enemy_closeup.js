import puppeteer from 'puppeteer';

async function testCloseup() {
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
    app.player.position.set(19.5, 1.6, 31.5);
    app.player.camera.position.set(19.5, 1.6, 31.5);
    app.player.yaw = 0;
    app.player.camera.rotation.y = 0;

    const guard = app.level.enemies.find((e) => !e.isOfficer);
    if (guard) {
      guard.group.position.set(19.5, 0, 33.8); // 2.3m away
      guard.group.rotation.y = Math.PI;
      guard.state = 'ATTACK';
    }
  });

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/guard_closeup_2m.png' });

  await browser.close();
  console.log('Closeup done');
}

testCloseup().catch(console.error);
