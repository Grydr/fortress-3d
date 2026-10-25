import puppeteer from 'puppeteer';

async function runAudit() {
  console.log('--- STARTING WOLFENSTEIN 3D AUTOMATED AUDIT ---');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/firefox',
    browser: 'firefox',
    headless: true,
    args: ['--no-remote'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const consoleLogs = [];
  const errors = [];
  page.on('console', (msg) => {
    console.log('BROWSER LOG:', msg.text());
    consoleLogs.push(msg.text());
  });
  page.on('pageerror', (err) => {
    console.error('BROWSER ERROR:', err.toString());
    errors.push(err.toString());
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 15000 });

  // 1. Check Start Overlay & Click Start
  console.log('Test 1: Starting Mission via Intro Briefing Overlay...');
  const startBtn = await page.$('#btn-start-game');
  if (!startBtn) throw new Error('Start button not found');
  await startBtn.click();
  await new Promise((r) => setTimeout(r, 600));

  const isOverlayHidden = await page.$eval('#start-overlay', (el) => el.classList.contains('hidden'));
  console.log('Start overlay dismissed:', isOverlayHidden ? 'PASS' : 'FAIL');

  // 2. Test HUD Elements and Initial Stats
  console.log('Test 2: Verifying HUD Elements...');
  const hudValues = await page.evaluate(() => {
    return {
      health: document.getElementById('dash-health-val')?.textContent,
      ammo: document.getElementById('dash-ammo-val')?.textContent,
      score: document.getElementById('dash-score-val')?.textContent,
      weapon: document.getElementById('dash-weapon-val')?.textContent,
      lives: document.getElementById('dash-lives-val')?.textContent,
    };
  });
  console.log('HUD initial stats:', hudValues);
  if (hudValues.health !== '100%') throw new Error(`Unexpected initial health: ${hudValues.health}`);
  if (hudValues.ammo !== '32') throw new Error(`Unexpected initial ammo: ${hudValues.ammo}`);
  if (hudValues.weapon !== 'LUGER') throw new Error(`Unexpected initial weapon: ${hudValues.weapon}`);

  // 3. Test Weapon Switching (Key 1 -> Knife, Key 2 -> Luger)
  console.log('Test 3: Testing Weapon Switching (1: Knife, 2: Luger)...');
  await page.keyboard.press('1');
  await new Promise((r) => setTimeout(r, 500));
  const wepAfter1 = await page.$eval('#dash-weapon-val', (el) => el.textContent);
  const ammoAfter1 = await page.$eval('#dash-ammo-val', (el) => el.textContent);
  console.log(`Switched to slot 1: Weapon=${wepAfter1}, Ammo=${ammoAfter1} (Expected KNIFE, ∞)`);

  await page.keyboard.press('2');
  await new Promise((r) => setTimeout(r, 500));
  const wepAfter2 = await page.$eval('#dash-weapon-val', (el) => el.textContent);
  console.log(`Switched back to slot 2: Weapon=${wepAfter2} (Expected LUGER)`);

  // 4. Test Raycast Shooting & Ammo Depletion (Click on canvas)
  console.log('Test 4: Testing Raycast Shooting...');
  const canvas = await page.$('canvas');
  await canvas.click();
  await new Promise((r) => setTimeout(r, 400));
  const ammoAfterShot = await page.$eval('#dash-ammo-val', (el) => el.textContent);
  console.log(`Ammo after shooting: ${ammoAfterShot} (Expected 31)`);
  if (ammoAfterShot !== '31') throw new Error(`Ammo did not decrement on shot: ${ammoAfterShot}`);

  // 5. Test Player Movement (W key press)
  console.log('Test 5: Testing Player Movement (Walking forward)...');
  await page.keyboard.down('KeyW');
  await new Promise((r) => setTimeout(r, 800));
  await page.keyboard.up('KeyW');
  await new Promise((r) => setTimeout(r, 200));

  // 6. Test Door Interaction via Raycast
  console.log('Test 6: Testing Door Interaction...');
  await page.keyboard.press('KeyE');
  await new Promise((r) => setTimeout(r, 500));

  // 7. Test Pause Menu Toggle & Credits Modal
  console.log('Test 7: Testing Pause Menu & Credits Modal...');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));
  const isPauseVisible = await page.$eval('#pause-modal', (el) => !el.classList.contains('hidden'));
  console.log('Pause modal visible on Escape:', isPauseVisible ? 'PASS' : 'FAIL');

  // Open Credits modal
  await page.click('#btn-credits');
  await new Promise((r) => setTimeout(r, 300));
  const isCreditsVisible = await page.$eval('#credits-modal', (el) => !el.classList.contains('hidden'));
  console.log('Credits modal opened:', isCreditsVisible ? 'PASS' : 'FAIL');

  // Close Credits modal
  await page.click('#btn-close-credits');
  await new Promise((r) => setTimeout(r, 300));

  // Resume game
  await page.click('#btn-resume');
  await new Promise((r) => setTimeout(r, 300));
  const isPauseHidden = await page.$eval('#pause-modal', (el) => el.classList.contains('hidden'));
  console.log('Pause modal closed on Resume:', isPauseHidden ? 'PASS' : 'FAIL');

  // 8. Capture Gameplay In-Action Screenshot
  await page.screenshot({ path: '/tmp/wolf_audit_gameplay.png' });
  console.log('Gameplay screenshot saved to /tmp/wolf_audit_gameplay.png');

  console.log('=== CONSOLE AUDIT LOGS ===');
  console.log(consoleLogs);
  console.log('=== AUDIT ERRORS ===');
  console.log(errors);

  await browser.close();

  if (errors.length > 0) {
    throw new Error(`Audit found errors: ${JSON.stringify(errors)}`);
  }

  console.log('--- ALL AUDIT TESTS PASSED WITH ZERO ERRORS ---');
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
