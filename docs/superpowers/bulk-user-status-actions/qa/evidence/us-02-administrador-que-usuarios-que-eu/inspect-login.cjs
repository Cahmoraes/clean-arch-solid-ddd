const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  const form = await page.locator('form').evaluate((el) => ({
    html: el.outerHTML.slice(0, 2000),
    buttons: Array.from(el.querySelectorAll('button')).map((b) => ({
      text: b.textContent.trim(),
      type: b.type,
      dataTestId: b.getAttribute('data-testid'),
      disabled: b.disabled,
    })),
    inputs: Array.from(el.querySelectorAll('input')).map((i) => ({
      type: i.type,
      name: i.name,
      placeholder: i.placeholder,
      dataTestId: i.getAttribute('data-testid'),
    })),
  }));
  console.log(JSON.stringify(form, null, 2));

  await page.getByRole('textbox', { name: 'E-mail' }).fill('admin@admin.com');
  await page.getByRole('textbox', { name: 'Senha' }).fill('admin@admin');

  const submitButton = page.locator('form button[type="submit"], form button:has-text("Entrar")').first();
  console.log('Submit visible:', await submitButton.isVisible().catch(() => false));

  const messages = [];
  page.on('console', (msg) => messages.push({ type: msg.type(), text: msg.text() }));
  page.on('response', (res) => {
    if (res.url().includes('/auth') || res.url().includes('/login')) {
      res.text().then((body) => messages.push({ type: 'response', url: res.url(), status: res.status(), body: body.slice(0, 500) })).catch(() => {});
    }
  });

  await submitButton.click();
  await page.waitForTimeout(5000);
  console.log('URL after click:', page.url());
  console.log('Title after click:', await page.title());

  const errorElements = await page.locator('[role="alert"], .text-red-500, .text-destructive').evaluateAll((els) => els.map((el) => el.textContent.trim()));
  console.log('Error messages:', errorElements);
  console.log('Console messages:', JSON.stringify(messages, null, 2));

  await browser.close();
})();
