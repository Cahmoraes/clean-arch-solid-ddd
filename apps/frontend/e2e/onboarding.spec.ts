import { expect, test } from "@playwright/test"
import {
	activateUserInDb,
	loginViaUi,
	makeUser,
	signupUser,
} from "./helpers/auth"
import { seedGym } from "./helpers/seed"

/**
 * Onboarding completo (RF-1 a RF-5, RF-12, RF-16):
 * cadastro -> ativação -> login -> busca de academia.
 *
 * Observação: o passo "primeiro check-in" do PRD não pode ser executado por
 * um MEMBER no estado atual do backend (POST /check-ins exige ADMIN), e a rota
 * GET /gyms/{id} usada pela tela de detalhe ainda não está implementada no
 * backend. Cobrimos check-in em `admin-validate-checkin.spec.ts` via SQL.
 * Esta limitação está registrada na revisão da Tarefa 12.
 */
test.describe("Onboarding completo", () => {
	test("cadastro -> ativação -> login -> busca de academia", async ({
		page,
	}) => {
		const user = makeUser()

		await page.goto("/cadastro")
		await page.getByLabel("Nome").fill(user.name)
		await page.getByLabel("E-mail").fill(user.email)
		await page.getByLabel("Senha").fill(user.password)
		await page.getByTestId("signup-submit").click()

		await expect(page.getByTestId("signup-success")).toBeVisible({
			timeout: 15_000,
		})
		await expect(page.getByTestId("signup-success")).toContainText(user.email)

		// Ativação direta no banco (substitui o clique no link do e-mail).
		await activateUserInDb(user.email)

		const gym = seedGym({ title: `Onboarding-${Date.now()}` })

		await loginViaUi(page, user)
		// O login cai em /inicio; a busca de academia vive em /academias.
		await page.goto("/academias")
		await expect(page).toHaveURL(/\/academias/)

		await page.getByTestId("gym-search-input").fill(gym.title)
		await page.getByTestId("gym-search-submit").click()

		await expect(page.getByTestId("gym-results")).toBeVisible()
		await expect(page.getByText(gym.title)).toBeVisible({ timeout: 15_000 })
	})
})

test("smoke: e-mail já existente exibe mensagem amigável", async ({
	page,
	request,
}) => {
	const user = makeUser()
	await signupUser(request, user)

	await page.goto("/cadastro")
	await page.getByLabel("Nome").fill(user.name)
	await page.getByLabel("E-mail").fill(user.email)
	await page.getByLabel("Senha").fill(user.password)
	await page.getByTestId("signup-submit").click()

	await expect(page.getByTestId("signup-submit-error")).toBeVisible({
		timeout: 15_000,
	})
})
