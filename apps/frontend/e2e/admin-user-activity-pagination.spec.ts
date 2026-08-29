import { expect, type Page, test } from "@playwright/test"
import { loginViaUi, provisionUser } from "./helpers/auth"
import { type SeededActivityEvent, seedActivityEvents } from "./helpers/seed"

/**
 * Cobre a consistência entre o resumo de atividade no painel de detalhes
 * (5 itens mais recentes) e a página completa
 * `/admin/usuarios/{userId}/atividade` (histórico paginado). Ambas as telas
 * leem do mesmo backend real, sem fixtures MSW isoladas — o ponto do teste é
 * provar que os dados batem.
 *
 * No viewport desktop padrão do Playwright (>= 768px), o painel de detalhes
 * do usuário renderiza inline na página (sem role="dialog") — ver
 * `UserDetailContainer`/`useIsDesktop`. Por isso os locators abaixo usam
 * `page` diretamente, e não `getByRole("dialog")`.
 */
test.describe("Admin visualiza atividade do usuário", () => {
	test("resumo do painel e página completa mostram os mesmos eventos do usuário", async ({
		page,
		request,
	}) => {
		const member = await provisionUser(request, { role: "MEMBER" })
		const admin = await provisionUser(request, { role: "ADMIN" })

		const memberId = member.id
		if (!memberId) throw new Error("Member id ausente após provisionUser")

		const seededEvents = seedActivityEvents(memberId, 7)

		await loginViaUi(page, admin)
		await page.goto("/admin/usuarios")
		await page.getByTestId("admin-users-search").fill(member.email)

		const row = page.getByTestId(`user-row-${memberId}`)
		await expect(row).toBeVisible({ timeout: 15_000 })
		await row.click()

		await page.getByRole("tab", { name: "Atividade" }).click()

		await assertDetailPanelSummaryMatchesSeededEvents(page, seededEvents)

		const historyLink = page.getByRole("link", {
			name: "Ver histórico completo",
		})
		await expect(historyLink).toBeVisible()
		await historyLink.click()

		await page.waitForURL(`**/admin/usuarios/${memberId}/atividade`, {
			timeout: 15_000,
		})

		await assertFullHistoryShowsAllSeededEvents(page, seededEvents)
	})
})

async function assertDetailPanelSummaryMatchesSeededEvents(
	page: Page,
	seededEvents: SeededActivityEvent[],
): Promise<void> {
	const mostRecentFive = seededEvents.slice(-5)
	const cutOffFromSummary = seededEvents.slice(0, -5)

	for (const event of mostRecentFive) {
		await expect(page.getByText(event.description)).toBeVisible()
	}
	for (const event of cutOffFromSummary) {
		await expect(page.getByText(event.description)).toBeHidden()
	}
}

async function assertFullHistoryShowsAllSeededEvents(
	page: Page,
	seededEvents: SeededActivityEvent[],
): Promise<void> {
	for (const event of seededEvents) {
		await expect(page.getByText(event.description)).toBeVisible({
			timeout: 10_000,
		})
	}
}
