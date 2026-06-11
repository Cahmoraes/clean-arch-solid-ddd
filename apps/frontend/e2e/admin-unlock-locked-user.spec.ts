import { expect, test } from "@playwright/test"
import { lockUserInDb, loginViaUi, provisionUser } from "./helpers/auth"

/**
 * Admin gerencia conta bloqueada por segurança (login-security-lockout).
 *
 * Cobre as user stories US-004 (admin desbloqueia conta `locked`) e US-005
 * (admin pode suspender conta `locked`) pela interface admin em /usuarios.
 */
test.describe("Admin gerencia usuário bloqueado", () => {
	test("admin vê status Bloqueado, desbloqueia e a conta volta a Ativo", async ({
		page,
		request,
	}) => {
		const member = await provisionUser(request, { role: "MEMBER" })
		const admin = await provisionUser(request, { role: "ADMIN" })

		const memberId = member.id
		if (!memberId) throw new Error("Member id ausente após provisionUser")

		await lockUserInDb(member.email)

		await loginViaUi(page, admin)
		await page.goto("/admin/usuarios")

		await page.getByTestId("admin-users-search").fill(member.email)

		const row = page.getByTestId(`user-row-${memberId}`)
		await expect(row).toBeVisible({ timeout: 15_000 })
		await expect(page.getByTestId(`user-row-${memberId}-status`)).toHaveText(
			"Bloqueado",
		)

		await row.click()

		const dialog = page.getByRole("dialog")
		await expect(dialog).toBeVisible()
		await expect(
			dialog.getByRole("button", { name: "Desbloquear" }),
		).toBeVisible()
		await expect(dialog.getByRole("button", { name: "Inativar" })).toBeVisible()

		await dialog.getByRole("button", { name: "Desbloquear" }).click()

		await expect(
			dialog.getByRole("button", { name: "Desbloquear" }),
		).toBeHidden({ timeout: 10_000 })
		await expect(page.getByTestId(`user-row-${memberId}-status`)).toHaveText(
			"Ativo",
			{ timeout: 10_000 },
		)
	})
})
