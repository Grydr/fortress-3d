import puppeteer from 'puppeteer';

async function testEnemyRender() {
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
    const enemy = app.level.enemies[0];

    // Put enemy right in front of player
    // Player is at (4.5, 1.6, 4.5), yaw = -Math.PI / 2 (facing -X)
    // So in front of player is -X:
    enemy.group.position.set(app.player.position.x - 2.5, 0, app.player.position.z);
    enemy.group.rotation.y = Math.PI / 2; // face +X towards player
    enemy.state = 'ATTACK';
  });

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/test_enemy_in_front.png' });

  await browser.close();
  console.log('Finished');
}

testEnemyRender().catch(console.error);
