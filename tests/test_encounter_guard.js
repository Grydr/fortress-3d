import puppeteer from 'puppeteer';

async function encounterGuard() {
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

  // Let's position player in the hallway facing the first guard!
  // Guard is at (x: 1, z: 6) -> world (4.5, 0, 19.5).
  // Hallway is open at x = 1 (world x = 4.5), z runs from 3 to 6!
  // Wait, let's open all doors so there are no closed doors blocking:
  await page.evaluate(() => {
    const app = window.gameApp;
    // Open all doors
    app.level.doors.forEach((d) => {
      d.isOpen = true;
      d.slideProgress = 1.0;
      if (d.leafMesh) d.leafMesh.position.x = 2.4;
    });

    // Place player at (4.5, 1.6, 12.0) looking towards +Z (yaw = 0) towards guard at z = 19.5!
    app.player.position.set(4.5, 1.6, 12.0);
    app.player.camera.position.set(4.5, 1.6, 12.0);
    app.player.yaw = 0;
    app.player.camera.rotation.y = 0;
    app.player.pitch = 0;
    app.player.camera.rotation.x = 0;
  });

  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: '/tmp/guard_in_hallway.png' });

  // Let game run for 1 second so guard detects player and attacks / shoots
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: '/tmp/guard_attacking.png' });

  await browser.close();
  console.log('Encounter finished');
}

encounterGuard().catch(console.error);
