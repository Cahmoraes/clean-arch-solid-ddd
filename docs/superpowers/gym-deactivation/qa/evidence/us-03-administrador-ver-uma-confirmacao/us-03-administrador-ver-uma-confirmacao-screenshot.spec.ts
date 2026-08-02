import { expect, test } from "@playwright/test"

const FRONTEND_URL = "http://localhost:3000"
const GYM_ID = "03fdfed6-0e94-43cb-b64f-5acb65020162"

test.use({ baseURL: FRONTEND_URL })

test("modal de confirmacao ao desativar academia (evidencia US-03/FR-004)", async ({
	page,
}) => {
	await page.goto("/login")
	await page.getByLabel("E-mail").fill("admin@admin.com")
	await page.getByLabel("Senha").fill("admin@admin")
	await page.getByTestId("login-submit").click()
	await page.waitForURL(/\/inicio/, { timeout: 30_000 })

	await page.goto(`/academias/${GYM_ID}`)

	const toggleButton = page.getByRole("button", { name: /Desativar academia|Reativar academia/ })
	await toggleButton.waitFor({ state: "visible", timeout: 30_000 })
	await toggleButton.click()

	const dialogHeading = page.getByRole("heading", {
		name: /Confirmar desativação|Confirmar reativação/,
	})
	await expect(dialogHeading).toBeVisible()

	await page.screenshot({
		path: "docs/superpowers/gym-deactivation/qa/evidence/us-03-administrador-ver-uma-confirmacao/confirmation-modal.png",
	})
})
