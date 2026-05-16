const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();

  // Desktop
  const desktopPage = await browser.newPage();
  await desktopPage.setViewportSize({ width: 1440, height: 900 });
  await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000); // wait for animations
  await desktopPage.screenshot({ path: 'screenshots/landing-desktop.png', fullPage: false });

  // Desktop fullpage
  await desktopPage.screenshot({ path: 'screenshots/landing-desktop-full.png', fullPage: true });

  // Mobile
  const mobilePage = await browser.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: 'screenshots/landing-mobile.png', fullPage: false });

  // Mobile fullpage
  await mobilePage.screenshot({ path: 'screenshots/landing-mobile-full.png', fullPage: true });

  await browser.close();
  console.log('Done!');
})();
