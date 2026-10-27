import puppeteer from 'puppeteer';

async function testInteractables() {
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

  const info = await page.evaluate(() => {
    const app = window.gameApp;
    const doors = app.level.doors.map(d => ({
      type: d.type,
      gridX: d.gridX,
      gridZ: d.gridZ,
      orientation: d.orientation,
      worldPos: { x: d.worldX, z: d.worldZ },
      isSecret: d.isSecret,
    }));
    return {
      interactableCount: app.level.interactableMeshes.length,
      doors,
    };
  });

  console.log('Interactables info:', JSON.stringify(info, null, 2));
  await browser.close();
}

testInteractables().catch(console.error);
