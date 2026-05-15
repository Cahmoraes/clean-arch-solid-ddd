# Task 5: Cobrir a jornada mista com testes determinísticos e Playwright [RF-007, RF-012, RF-013]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-mixed-login-external-accounts.md`
**Spec:** `../specs/mixed-login-external-accounts-design.md`

## Visão Geral

Fechar a iniciativa com cobertura automatizada que prove a transição de “conta externa sem senha” para “conta com login misto”. Como o popup real do Google não é determinístico em E2E local/CI, este task cria um seam de desenvolvimento estritamente não produtivo para registrar tokens válidos no `InMemoryGoogleAuthProvider`, enquanto o browser flow usa Playwright para validar o estado final da conta.

## Arquivos

- Create: `apps/backend/src/session/infra/controller/dev-google-token.controller.ts`
- Modify: `apps/backend/src/session/infra/controller/routes/session-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/auth-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/session/session-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-session-module.ts`
- Test: `apps/backend/src/session/infra/controller/dev-google-token.business-flow-test.ts`
- Modify: `apps/frontend/e2e/helpers/auth.ts`
- Create: `apps/frontend/e2e/mixed-login-external-accounts.spec.ts`

## Conformidade com as Competências Padrão

- `playwright-cli`
- `test-antipatterns`
- `test-driven-development`
- `no-workarounds`
- `systematic-debugging`

## Passos

- [ ] **Step 1: Write the failing test**

```ts
// apps/backend/src/session/infra/controller/dev-google-token.business-flow-test.ts
test("Deve registrar um token Google válido em ambiente não produtivo", async () => {
	const response = await request(fastifyServer.server)
		.post(SessionRoutes.DEV_GOOGLE_TOKEN)
		.send({
			idToken: "seeded-google-token",
			sub: "google-sub-123",
			email: "google-only@example.com",
			name: "Google Only",
			emailVerified: true,
		})

	expect(response.status).toBe(HTTP_STATUS.CREATED)
	expect(response.body).toEqual({ ok: true })
})

// apps/frontend/e2e/mixed-login-external-accounts.spec.ts
import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import {
	makeUser,
	defineFirstPasswordViaApi,
	loginViaEmailUi,
	loginViaSeededGoogleApi,
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
		await expect(page).toHaveURL(/\/academias/)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:business-flow -- src/session/infra/controller/dev-google-token.business-flow-test.ts && pnpm --filter frontend e2e -- e2e/mixed-login-external-accounts.spec.ts`
Expected: FAIL porque não existe um seam não produtivo para registrar tokens no `InMemoryGoogleAuthProvider` e os helpers Playwright ainda não conseguem montar a jornada externa → senha local → login por email/senha.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/backend/src/session/infra/controller/routes/session-routes.ts
export const SessionRoutes = {
	AUTHENTICATE: PREFIX,
	AUTHENTICATE_GOOGLE: `${PREFIX}/google`,
	DEV_GOOGLE_TOKEN: `${PREFIX}/google/dev-token`,
	REFRESH: `${PREFIX}/refresh`,
	LOGOUT: `${PREFIX}/logout`,
} as const

// apps/backend/src/shared/infra/ioc/module/service-identifier/auth-types.ts
Controllers: {
	Authenticate: Symbol.for("AuthenticateController"),
	AuthenticateWithGoogle: Symbol.for("AuthenticateWithGoogleController"),
	DevGoogleToken: Symbol.for("DevGoogleTokenController"),
	Logout: Symbol.for("LogoutController"),
	RefreshToken: Symbol.for("RefreshTokenController"),
},

// apps/backend/src/session/infra/controller/dev-google-token.controller.ts
@injectable()
export class DevGoogleTokenController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify) private readonly server: HttpServer,
		@inject(AUTH_TYPES.Providers.GoogleAuth)
		private readonly googleAuthProvider: GoogleAuthProvider,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	public async init(): Promise<void> {
		if (isProduction()) return
		this.server.register("post", SessionRoutes.DEV_GOOGLE_TOKEN, {
			callback: this.callback,
		})
	}

	private async callback(req: FastifyRequest) {
		const parsedBody = this.parseRequest(
			z.object({
				idToken: z.string().min(1),
				sub: z.string().min(1),
				email: z.email(),
				name: z.string().min(1),
				emailVerified: z.boolean().default(true),
			}),
			req.body,
		)
		if (parsedBody.isFailure()) return this.createResponseError(parsedBody)
		if (!(this.googleAuthProvider instanceof InMemoryGoogleAuthProvider)) {
			return ResponseFactory.NOT_FOUND({ message: "Not Found" })
		}

		this.googleAuthProvider.addValidToken(parsedBody.value.idToken, {
			sub: parsedBody.value.sub,
			email: parsedBody.value.email,
			name: parsedBody.value.name,
			emailVerified: parsedBody.value.emailVerified,
		})

		return ResponseFactory.CREATED({ body: { ok: true } })
	}
}

// apps/backend/src/shared/infra/ioc/module/session/session-module.ts
bind(AUTH_TYPES.Controllers.DevGoogleToken).to(DevGoogleTokenController)

// apps/backend/src/bootstrap/setup-session-module.ts
const controllers = [
	resolve(AUTH_TYPES.Controllers.Authenticate),
	resolve(AUTH_TYPES.Controllers.AuthenticateWithGoogle),
	resolve(AUTH_TYPES.Controllers.DevGoogleToken),
	resolve(AUTH_TYPES.Controllers.Logout),
]

// apps/frontend/e2e/helpers/auth.ts
export async function seedGoogleToken(
	request: APIRequestContext,
	input: { idToken: string; sub: string; email: string; name: string },
): Promise<{ idToken: string }> {
	const response = await request.post(`${BACKEND_URL}/sessions/google/dev-token`, {
		data: { ...input, emailVerified: true },
	})
	expect(response.ok(), await response.text()).toBeTruthy()
	return { idToken: input.idToken }
}

export async function loginViaSeededGoogleApi(
	request: APIRequestContext,
	page: Page,
	idToken: string,
): Promise<{ accessToken: string }> {
	const response = await request.post(`${BACKEND_URL}/sessions/google`, {
		data: { idToken },
	})
	expect(response.ok(), await response.text()).toBeTruthy()
	const body = (await response.json()) as { token: string }
	const cookies = response
		.headersArray()
		.filter((h) => h.name.toLowerCase() === "set-cookie")
	for (const cookie of cookies) {
		const [pair] = cookie.value.split(";")
		const [name, value] = pair.split("=")
		await page.context().addCookies([
			{
				name,
				value,
				domain: "localhost",
				path: "/",
				httpOnly: true,
			},
		])
	}
	return { accessToken: body.token }
}

export async function requestFirstPasswordGrant(
	request: APIRequestContext,
	accessToken: string,
	idToken: string,
): Promise<{ reauthGrant: string }> {
	const response = await request.post(`${BACKEND_URL}/users/me/password/reauth`, {
		headers: { Authorization: `Bearer ${accessToken}` },
		data: { provider: "google", idToken },
	})
	expect(response.ok(), await response.text()).toBeTruthy()
	return (await response.json()) as { reauthGrant: string }
}

export async function defineFirstPasswordViaApi(
	request: APIRequestContext,
	accessToken: string,
	reauthGrant: string,
	newPassword: string,
): Promise<void> {
	const response = await request.post(`${BACKEND_URL}/users/me/password`, {
		headers: { Authorization: `Bearer ${accessToken}` },
		data: {
			provider: "google",
			reauthGrant,
			newRawPassword: newPassword,
		},
	})
	expect(response.status(), await response.text()).toBe(204)
}

export async function loginViaEmailUi(
	page: Page,
	user: { email: string; password: string },
	expectedRedirect = "/academias",
): Promise<void> {
	await page.goto("/login")
	await page.getByLabel("E-mail").fill(user.email)
	await page.getByLabel("Senha").fill(user.password)
	await page.getByTestId("login-submit").click()
	await page.waitForURL(`**${expectedRedirect}**`, { timeout: 30_000 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:business-flow -- src/session/infra/controller/dev-google-token.business-flow-test.ts && pnpm --filter frontend lint:fix && pnpm --filter frontend e2e -- e2e/mixed-login-external-accounts.spec.ts`
Expected: PASS, com o seam de desenvolvimento restrito a ambiente não produtivo e o Playwright provando a transição de conta Google-only para conta com login misto sem depender do popup real do Google.

- [ ] **Step 5: Ask for commit approval and commit**

```bash
git add \
  apps/backend/src/session/infra/controller/dev-google-token.controller.ts \
  apps/backend/src/session/infra/controller/routes/session-routes.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/auth-types.ts \
  apps/backend/src/shared/infra/ioc/module/session/session-module.ts \
  apps/backend/src/bootstrap/setup-session-module.ts \
  apps/backend/src/session/infra/controller/dev-google-token.business-flow-test.ts \
  apps/frontend/e2e/helpers/auth.ts \
  apps/frontend/e2e/mixed-login-external-accounts.spec.ts

# Somente depois da permissão explícita do usuário:
git commit -m "test: cover mixed-login flow with deterministic e2e"
```

## Critérios de Sucesso

- Existe um seam de desenvolvimento claramente guardado para semear tokens válidos no `InMemoryGoogleAuthProvider`.
- O Playwright cobre a jornada externa → primeira senha → login por email/senha usando os endpoints reais do produto.
- O teste E2E não depende do popup real do Google e continua validando o comportamento funcional aprovado na spec.
