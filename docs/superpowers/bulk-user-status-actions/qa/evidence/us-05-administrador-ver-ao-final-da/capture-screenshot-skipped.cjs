const { chromium, request } = require("playwright")

;(async () => {
	const apiContext = await request.newContext({
		baseURL: "http://localhost:3333",
	})

	const loginResponse = await apiContext.post("/sessions", {
		data: { email: "admin@admin.com", password: "admin@admin" },
	})
	if (!loginResponse.ok()) {
		const body = await loginResponse.text()
		throw new Error(`Login failed: ${loginResponse.status()} ${body}`)
	}

	const storageState = await apiContext.storageState()
	const cookies = storageState.cookies.map((cookie) => ({
		name: cookie.name,
		value: cookie.value,
		domain: "localhost",
		path: "/",
		expires: -1,
		httpOnly: false,
		secure: false,
		sameSite: "Lax",
	}))
	cookies.push({
		name: "has_session",
		value: "1",
		domain: "localhost",
		path: "/",
		expires: -1,
		httpOnly: false,
		secure: false,
		sameSite: "Lax",
	})
	await apiContext.dispose()

	const browser = await chromium.launch({ headless: true })
	const context = await browser.newContext({ storageState: { cookies, origins: [] } })
	const page = await context.newPage()

	try {
		await page.goto("http://localhost:3000/admin/usuarios")
		await page.waitForSelector('[data-testid="admin-users-list"]', { timeout: 15000 })

		const rows = await page.locator('[data-testid^="user-row-"]').all()
		if (rows.length < 2) {
			throw new Error(`Need >= 2 users, found ${rows.length}`)
		}
		await rows[0].getByRole("checkbox").check()
		await rows[1].getByRole("checkbox").check()
		await page.getByRole("button", { name: "Ativar", exact: true }).click()
		await page.getByRole("button", { name: "Confirmar ativação" }).click()
		await page.waitForTimeout(2500)

		await page.screenshot({
			path: "docs/superpowers/bulk-user-status-actions/qa/evidence/us-05-administrador-ver-ao-final-da/screenshot-skipped.png",
			fullPage: true,
		})
		console.log("screenshot skipped saved")
	} catch (err) {
		console.error("error:", err.message)
		await page.screenshot({
			path: "docs/superpowers/bulk-user-status-actions/qa/evidence/us-05-administrador-ver-ao-final-da/screenshot-error.png",
			fullPage: true,
		})
	} finally {
		await browser.close()
	}
})()
