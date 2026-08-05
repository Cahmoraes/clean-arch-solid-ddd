const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const evidenceDir = __dirname;
  const screenshotPath = path.join(evidenceDir, 'screenshot.png');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    const loginResponse = await context.request.post('http://localhost:3333/sessions', {
      data: { email: 'admin@admin.com', password: 'admin@admin' },
      failOnStatusCode: false,
    });
    const loginBody = await loginResponse.json().catch(() => ({}));
    console.log('Login API status:', loginResponse.status(), 'body keys:', Object.keys(loginBody).join(','));
    if (!loginResponse.ok()) {
      throw new Error(`Login API failed: ${loginResponse.status()} ${JSON.stringify(loginBody)}`);
    }

    await context.addCookies([
      { name: 'has_session', value: '1', domain: 'localhost', path: '/', sameSite: 'Lax' },
    ]);

    await page.goto('http://localhost:3000/admin/usuarios', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    await page.goto('http://localhost:3000/admin/usuarios', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const adminTab = page.locator('button:has-text("Administradores")');
    await adminTab.waitFor({ state: 'visible', timeout: 10000 });
    await adminTab.click();
    await page.waitForTimeout(3000);

    await page.waitForSelector('[data-testid^="user-row"]', { timeout: 10000 }).catch(() => {});

    const disabledCheckbox = page.locator('[data-testid^="user-row"] [role="checkbox"][disabled]').first();
    if (await disabledCheckbox.isVisible().catch(() => false)) {
      await disabledCheckbox.evaluate((el) => {
        el.style.outline = '4px solid #f59e0b';
        el.style.outlineOffset = '2px';
        el.style.borderRadius = '4px';
      });
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved to ${screenshotPath}`);
  } catch (error) {
    console.error('Screenshot capture failed:', error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
