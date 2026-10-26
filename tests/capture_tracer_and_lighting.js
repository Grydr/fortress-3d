import puppeteer from 'puppeteer';
import fs from 'fs';

async function testTracerAndLighting() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/firefox',
    browser: 'firefox',
    headless: true,
    args: ['--no-remote'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 15000 });

  // Dismiss start overlay
  await page.click('#btn-start-game');
  await new Promise((r) => setTimeout(r, 600));

  // Screenshot 1: Brighter dungeon lighting view
  await page.screenshot({ path: '/tmp/test_brighter_lighting.png' });

  // Fire Luger by clicking center of screen
  await page.mouse.click(640, 360);
  await new Promise((r) => setTimeout(r, 20));
  await page.screenshot({ path: '/tmp/test_bullet_tracer.png' });

  // Wait and check ammo to confirm shot was fired
  await new Promise((r) => setTimeout(r, 200));
  const ammo = await page.$eval('#dash-ammo-val', (el) => el.textContent);
  console.log('Ammo after shot:', ammo);

  await browser.close();
  console.log('Tracer and lighting screenshots captured OK');
}

testTracerAndLighting().catch(console.error);
