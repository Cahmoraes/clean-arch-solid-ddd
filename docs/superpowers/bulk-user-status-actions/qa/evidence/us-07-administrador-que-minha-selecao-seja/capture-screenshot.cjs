const path = require("path");
const { chromium } = require("../../../../../../apps/frontend/node_modules/@playwright/test");

const evidenceDir = __dirname;
const screenshotPath = path.join(evidenceDir, "screenshot.png");
const debugPath = path.join(evidenceDir, "debug.png");

(async () => {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
	const page = await context.newPage();

	try {
		await page.goto("http://localhost:3000/login");
		await page.locator('input[name="email"]').fill("admin@admin.com");
		await page.locator('input[name="password"]').fill("admin@admin");
		await page.getByTestId("login-submit").click();
		await page.waitForURL("**/inicio", { timeout: 15000 });

		console.log("URL apos login:", page.url());

		await page.goto("http://localhost:3000/admin/usuarios");
		await page.waitForSelector('[data-testid="admin-users-list"]', { timeout: 10000 });

		const beforeSelectionPath = path.join(evidenceDir, "screenshot-before-selection.png");
		const afterSelectionPath = path.join(evidenceDir, "screenshot-after-selection.png");

		await page.screenshot({ path: beforeSelectionPath, fullPage: true });

		const checkboxes = page.getByRole("checkbox", { name: /Selecionar/ });
		await checkboxes.nth(1).check();
		await checkboxes.nth(2).check();

		await page.getByTestId("bulk-action-bar").waitFor({ state: "visible", timeout: 5000 });
		await page.screenshot({ path: afterSelectionPath, fullPage: true });

		await page.getByTestId("admin-users-search").fill("verificacao-us07");
		await page.getByTestId("bulk-action-bar").waitFor({ state: "hidden", timeout: 5000 });

		await page.screenshot({ path: screenshotPath, fullPage: true });
		console.log("screenshots capturados em", beforeSelectionPath, afterSelectionPath, screenshotPath);
	} catch (error) {
		console.error("Erro:", error.message);
		console.error("URL no momento do erro:", page.url());
		await page.screenshot({ path: debugPath, fullPage: true });
		console.log("debug screenshot salvo em", debugPath);
		process.exitCode = 1;
	} finally {
		await browser.close();
	}
})();
