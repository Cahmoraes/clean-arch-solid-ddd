import { expect, test } from "@playwright/test"
import { loginViaUi, provisionUser } from "./helpers/auth"

test.describe("Renovação transparente de sessão", () => {
	test("expirar token em memória dispara refresh e mantém usuário autenticado", async ({
		page,
		request,
	}) => {
		const user = await provisionUser(request, { role: "MEMBER" })

		await loginViaUi(page, user)
		await expect(page).toHaveURL(/\/academias/)

		// Simula a expiração do access token em memória limpando o auth-store
		// (mantendo o cookie httpOnly de refresh). A próxima requisição
		// autenticada deve disparar o token-refresh transparentemente.
		await page.evaluate(() => {
			const win = window as unknown as {
				__authStore?: {
					setState: (s: { accessToken: null; expiresAt: null }) => void
				}
			}
			// Quando exposto pelo provider, limpa o token; caso contrário, força
			// recarregamento que aciona refresh automático via RootProvider.
			win.__authStore?.setState({ accessToken: null, expiresAt: null })
		})

		// Hard reload força o RootProvider a tentar refresh usando o cookie
		await page.reload()

		// A página /academias requer auth — se o refresh funcionou, continuamos
		// nela; se falhou, somos redirecionados para /login.
		await page.waitForLoadState("networkidle")
		await expect(page).toHaveURL(/\/academias/, { timeout: 15_000 })

		// Realiza uma ação autenticada (busca) para confirmar que o cliente tem
		// um token válido após o refresh.
		await page.getByTestId("gym-search-input").fill("zzz-no-results")
		await page.getByTestId("gym-search-submit").click()
		// Não esperamos resultados; apenas que a request termine sem 401 forçando
		// logout. A presença do shell autenticado confirma sessão ativa.
		await expect(page.getByTestId("gym-results")).toBeVisible({
			timeout: 10_000,
		})
		await expect(page).not.toHaveURL(/\/login/)
	})
})
