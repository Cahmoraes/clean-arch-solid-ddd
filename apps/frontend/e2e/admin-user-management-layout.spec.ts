import { expect, test } from "@playwright/test"
import { loginViaUi, provisionUser } from "./helpers/auth"

/**
 * Fluxo integrado de gerenciamento de usuários (user-management-layout).
 *
 * Fecha a feature exercitando busca, seleção e anúncio aria-live (FR-015)
 * em conjunto, contra o backend real, como verificação final de que as
 * tasks 1-4 compõem corretamente.
 */
test.describe("Admin gerencia usuários — fluxo integrado", () => {
	test("busca, seleciona e abre o detalhe de um usuário", async ({
		page,
		request,
	}) => {
		const admin = await provisionUser(request, { role: "ADMIN" })
		const member = await provisionUser(request, { role: "MEMBER" })
		const memberId = member.id
		if (!memberId) throw new Error("Member id ausente após provisionUser")

		await loginViaUi(page, admin)
		await page.goto("/admin/usuarios")

		await page.getByTestId("admin-users-search").fill(member.email)

		const row = page.getByTestId(`user-row-${memberId}`)
		await expect(row).toBeVisible({ timeout: 15_000 })
		await row.click()

		await expect(page.getByRole("tab", { name: "Detalhes" })).toBeVisible()
		await expect(
			page.getByRole("tabpanel").getByText(member.email),
		).toBeVisible()

		const liveRegion = page.getByTestId("admin-users-live-region")
		await expect(liveRegion).toContainText(/selecionado/i)
	})
})
