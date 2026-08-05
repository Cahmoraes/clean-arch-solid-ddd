const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: 'E-mail' }).fill('admin@admin.com');
  await page.getByRole('textbox', { name: 'Senha' }).fill('admin@admin');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
    page.getByTestId('login-submit').click(),
  ]);

  await page.goto('http://localhost:3000/admin/usuarios', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const pageUrl = page.url();
  const pageTitle = await page.title();
  console.log('URL:', pageUrl);
  console.log('Title:', pageTitle);

  const tabs = await page.locator('button, a, [role="tab"]').evaluateAll((els) =>
    els
      .filter((el) => /administradores|membros|todos|ativos|inativos/i.test(el.textContent || ''))
      .map((el) => ({
        tag: el.tagName,
        role: el.getAttribute('role'),
        text: el.textContent.trim().slice(0, 60),
        disabled: el.disabled,
        classes: el.className,
      }))
  );
  console.log(JSON.stringify(tabs, null, 2));

  const rows = await page.locator('[data-testid^="user-row"]').evaluateAll((els) =>
    els.map((el) => ({
      testId: el.getAttribute('data-testid'),
      text: el.textContent.trim().slice(0, 120),
      checkboxDisabled: !!el.querySelector('input[type="checkbox"][disabled]'),
    }))
  );
  console.log('Rows found:', rows.length);
  console.log(JSON.stringify(rows.slice(0, 10), null, 2));

  await browser.close();
})();
