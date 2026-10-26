import puppeteer from 'puppeteer';

async function testTracer() {
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

  const canvas = await page.$('canvas');
  await canvas.click();
  await new Promise((r) => setTimeout(r, 60));

  await page.screenshot({ path: '/tmp/test_tracer_frame.png' });

  const ammo = await page.$eval('#dash-ammo-val', (el) => el.textContent);
  console.log('Ammo in UI:', ammo);

  await browser.close();
  console.log('Finished');
}

testTracer().catch(console.error);
