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

  const result = await page.evaluate(() => {
    const app = window.gameApp;
    const enemy = app.level.enemies[0];

    // Player at (4.5, 1.6, 4.5).
    // Let's turn player to look at +X (yaw = Math.PI / 2):
    app.player.yaw = Math.PI / 2;
    app.player.camera.rotation.y = Math.PI / 2;

    // Put enemy at (7.5, 0, 4.5) in the open space of Col 2, Row 1!
    enemy.group.position.set(7.5, 0, 4.5);
    enemy.group.rotation.y = -Math.PI / 2; // face -X towards player
    enemy.state = 'ATTACK';

    return {
      enemyPos: { x: enemy.group.position.x, y: enemy.group.position.y, z: enemy.group.position.z },
      enemyVisible: enemy.group.visible,
      torsoPos: { x: enemy.torso.position.x, y: enemy.torso.position.y, z: enemy.torso.position.z },
    };
  });

  console.log('Result:', result);

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/test_enemy_visible.png' });

  await browser.close();
  console.log('Done');
}

testEnemyRender().catch(console.error);
