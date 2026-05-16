const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Get total page height
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);

  // Scroll through the page slowly to trigger all scroll animations
  const step = 400;
  for (let y = 0; y < totalHeight; y += step) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(300);
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Now all animations are triggered — take full page screenshot
  await page.screenshot({ path: 'screenshots/landing-full-revealed.png', fullPage: true });

  // Also take viewport screenshots at key scroll positions
  const sections = [
    { name: 'hero', y: 0 },
    { name: 'trusted-by', y: 700 },
    { name: 'integration', y: 1400 },
    { name: 'features', y: 2200 },
    { name: 'editor', y: 3000 },
    { name: 'testimonials', y: 3800 },
    { name: 'cta', y: 4600 },
  ];

  for (const section of sections) {
    await page.evaluate((y) => window.scrollTo(0, y), section.y);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `screenshots/section-${section.name}.png` });
  }

  await browser.close();
  console.log('Done!');
})();
