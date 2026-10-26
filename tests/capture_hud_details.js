import puppeteer from 'puppeteer';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/firefox',
    browser: 'firefox',
    headless: true,
    args: ['--no-remote'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 15000 });

  // Screenshot 1: Start modal
  await page.screenshot({ path: '/tmp/test_modal.png' });

  // Dismiss start overlay
  await page.click('#btn-start-game');
  await new Promise((r) => setTimeout(r, 600));

  // Screenshot 2: Ingame HUD
  await page.screenshot({ path: '/tmp/test_hud.png' });

  // Trigger interaction prompt to inspect its border
  await page.evaluate(() => {
    const prompt = document.getElementById('interaction-prompt');
    if (prompt) {
      prompt.style.display = 'flex';
      prompt.innerHTML = '<span class="prompt-keycap">[E]</span> <span class="prompt-text">OPEN OAK DUNGEON DOOR</span>';
    }
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '/tmp/test_prompt.png' });

  await browser.close();
  console.log('Screenshots captured successfully');
}

capture().catch(console.error);
