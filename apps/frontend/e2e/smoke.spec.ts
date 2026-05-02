import { expect, test } from "@playwright/test"

test("playwright config loads and homepage responds", async ({ page }) => {
	const response = await page.goto("/")
	expect(response?.status()).toBeLessThan(500)
})
