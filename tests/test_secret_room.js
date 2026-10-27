import puppeteer from 'puppeteer';
import { copyFileSync } from 'fs';

async function testSecretRoom() {
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

  // 1. Teleport player into South Hallway in front of Secret Push-Wall (x: 14.5 * 3 = 43.5, z: 14.2 * 3 = 42.6)
  // Looking South towards z = 45.0 (yaw = Math.PI)
  await page.evaluate(() => {
    const app = window.gameApp;
    app.player.position.set(43.5, 1.6, 43.0);
    app.player.camera.position.set(43.5, 1.6, 43.0);
    app.player.yaw = Math.PI; // Face South (+Z) towards secret push wall at z: 46.5
    app.player.pitch = 0;
    app.player.camera.rotation.set(0, Math.PI, 0);
  });

  await new Promise((r) => setTimeout(r, 300));
  
  // Check hover prompt text
  const promptText = await page.evaluate(() => {
    return document.getElementById('interaction-prompt')?.textContent || '';
  });
  console.log('Hover prompt in front of secret wall:', promptText);

  await page.screenshot({ path: '/tmp/secret_wall_prompt.png' });

  // 2. Press 'E' to push the wall
  console.log('Interacting with secret push wall...');
  await page.keyboard.press('KeyE');
  
  // Wait 1.2s for secret door animation
  await new Promise((r) => setTimeout(r, 1200));

  // 3. Move player inside the secret room (x: 14 * 3 = 42.0, z: 17 * 3 = 51.0)
  const relicStatus = await page.evaluate(() => {
    const app = window.gameApp;
    app.player.position.set(43.5, 1.6, 50.0);
    app.player.camera.position.set(43.5, 1.6, 50.0);
    app.player.update(0.1, app.level.doors, app.collectibles);
    app.collectibles.update(0.1, app.player, (msg, type) => app.hud.showNotification(msg, type));

    return {
      hasFoundRelic: app.player.hasFoundRelic,
      score: app.player.score,
    };
  });

  console.log('Relic pickup status:', relicStatus);

  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: '/tmp/inside_secret_room.png' });

  copyFileSync('/tmp/secret_wall_prompt.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/secret_wall_prompt.png');
  copyFileSync('/tmp/inside_secret_room.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/inside_secret_room.png');

  await browser.close();
  console.log('Secret room test complete!');
}

testSecretRoom().catch(console.error);
