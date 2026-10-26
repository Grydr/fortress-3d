import puppeteer from 'puppeteer';
import { copyFileSync } from 'fs';

async function testPoses() {
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

  // Player starts at (4.5, 1.6, 4.5) with yaw = -Math.PI / 2 looking at +X.
  // Place enemy at (6.8, 0, 4.5) in cell doorway, facing -X (rotation.y = -Math.PI / 2) towards player!
  await page.evaluate(() => {
    const app = window.gameApp;
    app.player.position.set(4.2, 1.6, 4.5);
    app.player.camera.position.set(4.2, 1.6, 4.5);
    app.player.yaw = -Math.PI / 2;
    app.player.pitch = 0;
    app.player.camera.rotation.set(0, -Math.PI / 2, 0);

    const guard = app.level.enemies[0];
    guard.update = () => {}; // Freeze AI movement during visual snapshot

    guard.group.position.set(6.6, 0, 4.5);
    guard.group.rotation.y = -Math.PI / 2; // Face towards player (-X)
    guard.state = 'PATROL';
    
    // Walking pose: Left leg swinging forward from hip (y=0.70), right leg back
    // Left arm swinging forward from shoulder (y=0.26), right arm swinging back
    const walkAngle = 0.55;
    guard.leftLeg.rotation.x = walkAngle;
    guard.rightLeg.rotation.x = -walkAngle;
    guard.leftArm.rotation.x = -0.45;
    guard.rightArm.rotation.x = 0.45;
  });

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/guard_walk_pose.png' });

  // Aiming pose: guard standing, right arm raised straight from shoulder aiming gun at player
  await page.evaluate(() => {
    const app = window.gameApp;
    const guard = app.level.enemies[0];
    guard.state = 'ATTACK';
    guard.leftLeg.rotation.x = 0;
    guard.rightLeg.rotation.x = 0;
    guard.rightArm.rotation.x = -1.35; // Shoulder pivots arm straight forward
    guard.leftArm.rotation.x = -0.35;
  });

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/guard_aim_pose.png' });

  // SS Officer aiming pose
  await page.evaluate(() => {
    const app = window.gameApp;
    app.level.enemies[0].group.position.set(0, -100, 0);

    const officer = app.level.enemies.find((e) => e.isOfficer);
    if (officer) {
      officer.update = () => {};
      officer.group.position.set(6.6, 0, 4.5);
      officer.group.rotation.y = -Math.PI / 2;
      officer.state = 'ATTACK';
      officer.leftLeg.rotation.x = 0;
      officer.rightLeg.rotation.x = 0;
      officer.rightArm.rotation.x = -1.35;
      officer.leftArm.rotation.x = -0.35;
    }
  });

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/officer_aim_pose.png' });

  copyFileSync('/tmp/guard_walk_pose.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/guard_walk_pose.png');
  copyFileSync('/tmp/guard_aim_pose.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/guard_aim_pose.png');
  copyFileSync('/tmp/officer_aim_pose.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/officer_aim_pose.png');

  await browser.close();
  console.log('Poses captured successfully.');
}

testPoses().catch(console.error);
