import { expect, test } from "@playwright/test"
import { loginViaUi, provisionUser } from "./helpers/auth"
import { seedCheckIn, seedGym } from "./helpers/seed"

/**
 * Admin aprova check-in (RF-18).
 *
 * A ação de "validar" foi renomeada para "aprovar" pela feature
 * checkin-approve-reject: o botão usa testid `checkin-approve-<id>` e o
 * toast de sucesso é "Check-in aprovado com sucesso.".
 */
test.describe("Admin aprova check-in", () => {
	test("admin vê check-in pendente, aprova e recebe confirmação", async ({
		page,
		request,
	}) => {
		const member = await provisionUser(request, { role: "MEMBER" })
		const admin = await provisionUser(request, { role: "ADMIN" })
		const gym = seedGym()

		const memberId = member.id
		if (!memberId) throw new Error("Member id ausente após provisionUser")

		seedCheckIn({
			userId: memberId,
			gymId: gym.id,
			latitude: gym.latitude,
			longitude: gym.longitude,
		})

		await loginViaUi(page, admin)
		await page.goto("/admin/check-ins")

		const list = page.getByTestId("admin-checkins-list")
		await expect(list).toBeVisible({ timeout: 15_000 })

		const approveButton = list.locator('[data-testid^="checkin-approve-"]')
		await expect(approveButton.first()).toBeVisible()
		await approveButton.first().click()

		await expect(page.getByText(/check-in aprovado com sucesso/i)).toBeVisible({
			timeout: 10_000,
		})
	})
})
