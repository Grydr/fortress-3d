import puppeteer from 'puppeteer';

async function findBanners() {
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

  const bannersInfo = await page.evaluate(() => {
    const banners = [];
    window.gameApp.scene.traverse((obj) => {
      if (obj.geometry && obj.geometry.type === 'PlaneGeometry' && obj.geometry.parameters.width === 1.6) {
        banners.push({
          name: obj.name,
          position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
          rotation: { y: obj.rotation.y },
          material: obj.material ? obj.material.type : null,
        });
      }
    });
    return banners;
  });

  console.log('Banners in scene:', JSON.stringify(bannersInfo, null, 2));
  await browser.close();
}

findBanners().catch(console.error);
