import puppeteer from 'puppeteer';
import { copyFileSync } from 'fs';

async function captureBorderlessUI() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/firefox',
    browser: 'firefox',
    headless: true,
    args: ['--no-remote'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 15000 });

  // 1. Capture Start Modal
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: '/tmp/borderless_start_modal.png' });

  // 2. Click Start and capture in-game HUD
  await page.click('#btn-start-game');
  await new Promise((r) => setTimeout(r, 700));

  // Trigger a notification toast to inspect toast styling
  await page.evaluate(() => {
    window.gameApp.hud.showNotification('Discovered Iron Cell Passage!', 'gold');
  });

  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/borderless_hud_gameplay.png' });

  // 3. Press Escape to open Pause Modal
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: '/tmp/borderless_pause_modal.png' });

  copyFileSync('/tmp/borderless_start_modal.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/borderless_start_modal.png');
  copyFileSync('/tmp/borderless_hud_gameplay.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/borderless_hud_gameplay.png');
  copyFileSync('/tmp/borderless_pause_modal.png', '/home/gryd/.gemini/antigravity-cli/brain/f59b8ff4-ecc4-44ce-8e22-99b2550bd997/borderless_pause_modal.png');

  await browser.close();
  console.log('Borderless UI screenshots captured OK');
}

captureBorderlessUI().catch(console.error);
