const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const loginResponse = await context.request.post('http://localhost:3333/sessions', {
    data: { email: 'admin@admin.com', password: 'admin@admin' },
  });
  if (!loginResponse.ok()) {
    console.error('Login failed:', loginResponse.status());
    await browser.close();
    return;
  }
  await context.addCookies([
    { name: 'has_session', value: '1', domain: 'localhost', path: '/', sameSite: 'Lax' },
  ]);

  await page.goto('http://localhost:3000/admin/usuarios', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

  await page.locator('button:has-text("Administradores")').click();
  await page.waitForTimeout(2000);

  const checkboxes = await page.locator('[data-testid^="user-row"] input[type="checkbox"], [data-testid^="user-row"] [role="checkbox"]').evaluateAll((els) =>
    els.map((el) => ({
      tag: el.tagName,
      role: el.getAttribute('role'),
      disabled: el.disabled,
      dataDisabled: el.getAttribute('data-disabled'),
      ariaDisabled: el.getAttribute('aria-disabled'),
      text: el.closest('[data-testid^="user-row"]')?.textContent?.trim().slice(0, 80),
    }))
  );
  console.log(JSON.stringify(checkboxes, null, 2));

  await browser.close();
})();
