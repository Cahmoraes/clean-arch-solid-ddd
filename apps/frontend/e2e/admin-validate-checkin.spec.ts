import { expect, test } from "@playwright/test"
import { loginViaUi, provisionUser } from "./helpers/auth"
import { seedCheckIn, seedGym } from "./helpers/seed"

/**
 * Admin valida check-in (RF-18).
 */
test.describe("Admin valida check-in", () => {
	test("admin vê check-in pendente, valida e recebe confirmação", async ({
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

		const validateButton = list.locator(
			'[data-testid^="admin-checkin-validate-"]',
		)
		await expect(validateButton.first()).toBeVisible()
		await validateButton.first().click()

		await expect(page.getByText(/check-in validado com sucesso/i)).toBeVisible({
			timeout: 10_000,
		})
	})
})
