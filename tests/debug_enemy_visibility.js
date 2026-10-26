import puppeteer from 'puppeteer';

async function debugEnemies() {
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

  const debugData = await page.evaluate(() => {
    const app = window.gameApp;
    if (!app || !app.level) return { error: 'No app or level' };

    const enemies = app.level.enemies;
    const enemyList = enemies.map((e, idx) => {
      const pos = e.group.position;
      const children = [];
      e.group.traverse((child) => {
        children.push({
          type: child.type,
          name: child.name,
          visible: child.visible,
          isMesh: child.isMesh,
          material: child.material ? {
            type: child.material.type,
            color: child.material.color?.getHexString(),
            opacity: child.material.opacity,
            transparent: child.material.transparent,
            visible: child.material.visible,
            depthWrite: child.material.depthWrite,
            depthTest: child.material.depthTest,
          } : null,
        });
      });
      return {
        idx,
        type: e.type,
        state: e.state,
        pos: { x: pos.x, y: pos.y, z: pos.z },
        visible: e.group.visible,
        childCount: children.length,
        childrenSample: children,
      };
    });

    // Teleport player right in front of enemy 0, facing the enemy
    const firstEnemy = enemies[0];
    app.player.position.set(firstEnemy.group.position.x, 1.6, firstEnemy.group.position.z - 3.0);
    app.player.camera.position.copy(app.player.position);
    app.player.yaw = 0; // facing +Z towards enemy
    app.player.camera.rotation.y = 0;
    app.player.pitch = 0;
    app.player.camera.rotation.x = 0;

    return {
      playerPos: { x: app.player.position.x, y: app.player.position.y, z: app.player.position.z },
      firstEnemyPos: { x: firstEnemy.group.position.x, y: firstEnemy.group.position.y, z: firstEnemy.group.position.z },
      enemyList,
    };
  });

  console.log('DEBUG DATA:');
  console.log(JSON.stringify(debugData, null, 2));

  // Wait 1 frame and take screenshot
  await new Promise((r) => setTimeout(r, 100));
  await page.screenshot({ path: '/tmp/enemy_debug_closeup.png' });

  await browser.close();
  console.log('Finished debug');
}

debugEnemies().catch(console.error);
