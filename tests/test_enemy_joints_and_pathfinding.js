import puppeteer from 'puppeteer';
import { copyFileSync } from 'fs';

async function runTest() {
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
  await new Promise(r => setTimeout(r, 600));

  // Run tests in page context
  const testResults = await page.evaluate(() => {
    const app = window.gameApp;
    const enemy = app.level.enemies[0];

    // 1. Joint hierarchy check
    const hipPosLeft = { x: enemy.leftLeg.position.x, y: enemy.leftLeg.position.y, z: enemy.leftLeg.position.z };
    const hipPosRight = { x: enemy.rightLeg.position.x, y: enemy.rightLeg.position.y, z: enemy.rightLeg.position.z };
    const shoulderPosLeft = { x: enemy.leftArm.position.x, y: enemy.leftArm.position.y, z: enemy.leftArm.position.z };
    const shoulderPosRight = { x: enemy.rightArm.position.x, y: enemy.rightArm.position.y, z: enemy.rightArm.position.z };

    // 2. Test Pathfinding:
    // Move enemy to (3, 0, 13) and player to (7, 1.6, 15)
    enemy.group.position.set(3, 0, 13);
    app.player.camera.position.set(7, 1.6, 15);
    enemy.state = 'CHASE';
    enemy.pathTimer = 100; // force path recalculate
    
    // Step enemy update with delta 0.05
    enemy.update(0.05, app.player, app.level.getSightBlockers(), app.level.doors, app.collectibles);

    const pathLength = enemy.currentPath ? enemy.currentPath.length : 0;
    const waypoints = enemy.currentPath ? enemy.currentPath.map(w => ({ gx: w.gx, gz: w.gz })) : [];

    // Check if waypoints touch any solid wall (tile '1')
    const layout = [
      ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1'],
      ['1', '0', '0', '0', '1', '0', '0', '0', '1', '0', '0', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'],
      ['1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '1', '1', '0', '1', '1', '1', '1', '0', '1'],
      ['1', '0', '1', '0', '0', '0', '1', '0', '0', '0', '1', '0', '0', '0', '1', '0', '0', '0', '0', '0', '0', '1', '0', '1'],
      ['1', '0', '1', '1', '1', '0', '1', '1', '1', '0', '1', '1', '1', '0', '1', '0', '1', '1', '1', '1', '0', '1', '0', '1'],
      ['1', '0', '0', '0', 'D', '0', '0', '0', 'D', '0', '0', '0', 'D', '0', '1', '0', '1', '0', '0', '1', '0', '1', '0', '1'],
      ['1', '0', '1', '1', '1', '1', '1', '0', '1', '1', '1', '1', '1', '0', '1', '0', '1', '0', '0', '1', '0', '1', '0', '1'],
      ['1', '0', '0', '0', '0', '0', '1', '0', '0', '0', '0', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'],
      ['1', '1', '1', '1', '1', '0', '1', '1', '1', '1', '1', '0', '1', '0', '1', '0', '0', '0', '0', '0', '0', '1', '0', '1'],
      ['1', '0', '0', '0', '1', '0', '0', '0', '0', '0', '1', '0', '1', '0', '1', '1', '1', 'S', '1', '1', '1', '1', '0', '1'],
      ['1', '0', '1', '0', '1', '1', '1', '0', '1', '0', '1', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'],
      ['1', '0', '1', '0', '0', '0', '1', '0', '1', '0', '0', '0', '1', '0', '1', '1', '1', '1', '1', '1', '1', '1', '0', '1'],
      ['1', '0', '1', '1', '1', '0', '1', '0', '1', '1', '1', '0', '1', '0', '1', '0', '0', '0', '0', '0', '0', '1', '0', '1'],
      ['1', '0', '0', '0', '1', '0', '1', '0', '0', '0', '1', '0', '1', '0', '1', '0', '1', '1', '1', '1', '0', '1', '0', '1'],
      ['1', '1', '1', '0', '1', '0', '1', '1', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '0', '1', '0', '1', '0', '1'],
      ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '0', '1', '0', 'G', '1', '0', '1', '0', '1'],
      ['1', '0', '1', '1', '1', '1', '0', '1', '1', '0', '1', '1', '0', '0', '0', '0', '1', '1', '0', '0', '0', '1', '0', '1'],
      ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1', '0', '0', '0', '0', '1', '1', '0', '0', '0', '1', '0', '1'],
      ['1', '1', '1', '1', '1', '1', '1', '1', '1', '0', '1', '1', '0', '0', '0', '0', '1', '1', '0', '0', '0', '1', '0', '1'],
      ['1', '0', '0', '0', '0', '0', '0', '0', '1', '0', '1', '1', '1', '1', '1', '1', '1', '1', '0', '0', '0', '1', '0', '1'],
      ['1', '0', '1', '1', '0', '1', '1', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'],
      ['1', '0', '1', '1', '0', '1', '1', '0', 'D', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'],
      ['1', '0', '0', '0', '0', '0', '0', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'],
      ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1'],
    ];

    let anyWallHit = false;
    for (const wp of waypoints) {
      if (layout[wp.gz] && layout[wp.gz][wp.gx] === '1') {
        anyWallHit = true;
      }
    }

    return {
      hipPosLeft,
      hipPosRight,
      shoulderPosLeft,
      shoulderPosRight,
      pathLength,
      waypoints,
      anyWallHit,
      enemyState: enemy.state,
    };
  });

  console.log('Test Results:', JSON.stringify(testResults, null, 2));

  // Visual capture 1: Enemy walking towards camera in open space
  await page.evaluate(() => {
    const app = window.gameApp;
    const enemy = app.level.enemies[0];
    app.player.yaw = Math.PI / 2;
    app.player.camera.rotation.y = Math.PI / 2;
    enemy.group.position.set(7.5, 0, 4.5);
    enemy.group.rotation.y = -Math.PI / 2; // face towards player
    enemy.state = 'PATROL';
    // simulate walk swing
    enemy.walkCycle = Math.PI / 3;
    enemy.leftLeg.rotation.x = Math.sin(enemy.walkCycle) * 0.45;
    enemy.rightLeg.rotation.x = -Math.sin(enemy.walkCycle) * 0.45;
    enemy.leftArm.rotation.x = -Math.sin(enemy.walkCycle) * 0.4;
    enemy.rightArm.rotation.x = Math.sin(enemy.walkCycle) * 0.4;
  });

  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/guard_walking_joints.png' });

  // Visual capture 2: Enemy aiming gun towards camera
  await page.evaluate(() => {
    const app = window.gameApp;
    const enemy = app.level.enemies[0];
    enemy.state = 'ATTACK';
    enemy.leftLeg.rotation.x = 0;
    enemy.rightLeg.rotation.x = 0;
    enemy.rightArm.rotation.x = -1.35;
    enemy.leftArm.rotation.x = -0.4;
  });

  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/guard_aiming_joints.png' });

  copyFileSync('/tmp/guard_walking_joints.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/guard_walking_joints.png');
  copyFileSync('/tmp/guard_aiming_joints.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/guard_aiming_joints.png');

  await browser.close();
  console.log('Screenshots copied to brain artifacts directory.');
}

runTest().catch(console.error);
