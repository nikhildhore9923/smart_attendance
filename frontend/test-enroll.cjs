const { chromium } = require('playwright');
(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@college.edu'); // check auth config
    await page.fill('input[type="password"]', 'admin123'); // guess pass
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    await page.goto('http://localhost:5173/enroll');
    await page.waitForSelector('text=Select a student');
    console.log('Enroll page loaded');
    
    const studentItem = await page.div[style*="cursor: pointer"];
    if (studentItem) {
      console.log('Found student item, clicking...');
      await studentItem.click();
      await page.waitForTimeout(1000);
      const html = await page.content();
      if (html.includes('Checking status') || html.includes('Roll Number:')) {
        console.log('Right panel updated successfully!');
      } else {
        console.log('Right panel DID NOT update!');
      }
    } else {
      console.log('No student items found on the left panel.');
    }
    await browser.close();
  } catch (e) {
    console.error('Test failed:', e);
  }
})();
