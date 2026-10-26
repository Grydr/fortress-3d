import puppeteer from 'puppeteer';
import { copyFileSync } from 'fs';

async function testWalkProfile() {
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

  // Capture guard walking at 3/4 profile
  await page.evaluate(() => {
    const app = window.gameApp;
    app.player.position.set(4.2, 1.6, 4.5);
    app.player.camera.position.set(4.2, 1.6, 4.5);
    app.player.yaw = -Math.PI / 2;
    app.player.pitch = 0;
    app.player.camera.rotation.set(0, -Math.PI / 2, 0);

    const guard = app.level.enemies[0];
    guard.update = () => {}; // freeze

    guard.group.position.set(6.7, 0, 4.5);
    // Rotate to 3/4 angle towards camera
    guard.group.rotation.y = -Math.PI / 2 + 0.65;
    guard.state = 'PATROL';
    
    // Hip joint stride: left leg swinging forward (+0.6 rad), right leg swinging back (-0.6 rad)
    // Shoulder joint stride: right arm swinging forward (+0.5 rad), left arm swinging back (-0.5 rad)
    guard.leftLeg.rotation.x = 0.65;
    guard.rightLeg.rotation.x = -0.65;
    guard.leftArm.rotation.x = -0.55;
    guard.rightArm.rotation.x = 0.55;
  });

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/guard_walk_3quarter.png' });
  copyFileSync('/tmp/guard_walk_3quarter.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/guard_walk_3quarter.png');

  await browser.close();
  console.log('Walk profile captured OK');
}

testWalkProfile().catch(console.error);
