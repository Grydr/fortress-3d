import puppeteer from 'puppeteer';

async function testEnemyVisual() {
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

  // Place player in the open Grand Hall (Col 6, Row 10 -> x: 19.5, z: 31.5) facing +Z (yaw: 0)
  await page.evaluate(() => {
    const app = window.gameApp;
    app.player.position.set(19.5, 1.6, 30.0);
    app.player.camera.position.set(19.5, 1.6, 30.0);
    app.player.yaw = 0; // look +Z
    app.player.camera.rotation.y = 0;
    app.player.pitch = 0;
    app.player.camera.rotation.x = 0;

    // Place Guard at (19.5, 0, 34.0) facing -Z (towards player)
    const guard = app.level.enemies.find((e) => !e.isOfficer);
    if (guard) {
      guard.group.position.set(19.5, 0, 34.0);
      guard.group.rotation.y = Math.PI; // face -Z
      guard.state = 'ATTACK';
    }
  });

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/enemy_guard_full_body.png' });

  // Place SS Officer at (19.5, 0, 34.0) facing -Z (towards player)
  await page.evaluate(() => {
    const app = window.gameApp;
    // Hide guard
    const guard = app.level.enemies.find((e) => !e.isOfficer);
    if (guard) guard.group.position.set(0, -100, 0);

    const officer = app.level.enemies.find((e) => e.isOfficer);
    if (officer) {
      officer.group.position.set(19.5, 0, 34.0);
      officer.group.rotation.y = Math.PI; // face -Z
      officer.state = 'ATTACK';
    }
  });

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/enemy_officer_full_body.png' });

  await browser.close();
  console.log('Visual confirmation captured OK');
}

testEnemyVisual().catch(console.error);
