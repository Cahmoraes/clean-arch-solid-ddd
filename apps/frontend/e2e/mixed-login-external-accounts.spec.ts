import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import {
	defineFirstPasswordViaApi,
	loginViaEmailUi,
	loginViaSeededGoogleApi,
	makeUser,
	requestFirstPasswordGrant,
	seedGoogleToken,
} from "./helpers/auth"

test.describe("Login misto para contas externas", () => {
	test("conta Google-only passa a aceitar email/senha após definir a primeira senha", async ({
		page,
		request,
	}) => {
		const user = makeUser({ password: "Senha123!" })
		const googleSub = randomUUID()
		const idToken = `seeded-${googleSub}`
		const seeded = await seedGoogleToken(request, {
			idToken,
			sub: googleSub,
			email: user.email,
			name: user.name,
		})

		const session = await loginViaSeededGoogleApi(request, page, seeded.idToken)

		await page.goto("/perfil")
		await expect(page.getByTestId("profile-change-password-link")).toHaveText(
			/definir senha/i,
		)

		const { reauthGrant } = await requestFirstPasswordGrant(
			request,
			session.accessToken,
			seeded.idToken,
		)

		await defineFirstPasswordViaApi(
			request,
			session.accessToken,
			reauthGrant,
			user.password,
		)

		await page.reload()
		await expect(page.getByTestId("profile-change-password-link")).toHaveText(
			/alterar senha/i,
		)

		await page.getByLabel("Menu de usuário").click()
		await page.getByText("Sair").click()
		await expect(page).toHaveURL(/\/login/)

		await loginViaEmailUi(page, {
			email: user.email,
			password: user.password,
		})
		await expect(page).toHaveURL(/\/inicio/)
	})
})
