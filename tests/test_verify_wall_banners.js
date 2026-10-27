import puppeteer from 'puppeteer';
import { copyFileSync } from 'fs';

async function testWallBanners() {
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

  // Retrieve all banner objects and their positions
  const bannerList = await page.evaluate(() => {
    const list = [];
    window.gameApp.scene.traverse((obj) => {
      if (obj.name && obj.name.startsWith('WallBanner_')) {
        list.push({
          name: obj.name,
          worldPos: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
          rotationY: obj.rotation.y,
          childrenCount: obj.children.length,
        });
      }
    });
    return list;
  });

  console.log('Mounted Banners:', JSON.stringify(bannerList, null, 2));

  // Visual 1: View banner mounted on the wall right outside starting cell (at x: 2, z: 1 -> world: 7.5, 2.35, 1.52)
  // Player at (7.5, 1.6, 5.0) looking North (-Z, yaw: 0) directly at the wall banner!
  await page.evaluate(() => {
    const app = window.gameApp;
    app.player.position.set(7.5, 1.6, 4.8);
    app.player.camera.position.set(7.5, 1.6, 4.8);
    app.player.yaw = 0; // Look North (-Z)
    app.player.pitch = 0.05;
    app.player.camera.rotation.set(0.05, 0, 0);
  });

  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: '/tmp/cell_hallway_banner_mounted.png' });

  // Visual 2: View banner in Grand Hall mounted on the South Wall (at x: 16 * 3 + 1.5 = 49.5, z: 12 * 3 + 3 - 0.02 = 38.98)
  // Place player at (49.5, 1.6, 34.5) looking South (+Z, yaw: Math.PI) at the banner!
  await page.evaluate(() => {
    const app = window.gameApp;
    app.player.position.set(49.5, 1.6, 34.5);
    app.player.camera.position.set(49.5, 1.6, 34.5);
    app.player.yaw = Math.PI; // Look South (+Z)
    app.player.pitch = 0.05;
    app.player.camera.rotation.set(0.05, Math.PI, 0);
  });

  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: '/tmp/grand_hall_banner_mounted.png' });

  copyFileSync('/tmp/cell_hallway_banner_mounted.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/cell_hallway_banner_mounted.png');
  copyFileSync('/tmp/grand_hall_banner_mounted.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/grand_hall_banner_mounted.png');

  await browser.close();
  console.log('Wall banner screenshots captured OK');
}

testWallBanners().catch(console.error);
