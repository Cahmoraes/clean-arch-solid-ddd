# Task 1: Provider Google troca authorization code por tokens [FR-003]

**Status:** PENDING

**PRD:** `../prd/prd-google-custom-signin-button.md`

**Spec:** `../specs/google-custom-signin-button-design.md`

**Tier:** capable

## Visão Geral

A fronteira `GoogleAuthProvider` deixa de verificar um ID token que o browser entrega e passa a receber um authorization code, trocá-lo por tokens com o `GOOGLE_CLIENT_SECRET` do servidor e verificar o `id_token` resultante amarrado ao `GOOGLE_CLIENT_ID`. A guarda de env passa a exigir as duas variáveis e falha antes de qualquer chamada HTTP, e o provider in-memory usado nos business-flows passa a registrar authorization codes em vez de tokens. Quatro tasks seguintes consomem esta superfície.

## Arquivos

- Modify: `apps/backend/src/session/application/provider/google-auth-provider.ts`
- Modify: `apps/backend/src/session/infra/provider/google-auth-provider-impl.ts`
- Modify: `apps/backend/src/session/infra/provider/in-memory-google-auth-provider.ts`
- Modify: `apps/backend/src/shared/infra/env/env-schema.ts`
- Test: `apps/backend/src/session/infra/provider/google-auth-provider-impl.test.ts`
- Modify: `apps/backend/src/session/infra/controller/dev-google-token.controller.ts`
- Test: `apps/backend/src/session/infra/provider/in-memory-google-auth-provider.test.ts`
- Test: `apps/backend/src/session/infra/controller/dev-google-token.business-flow-test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:**
  - `GoogleAuthProvider.verify(authCode: string): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>>` — assinatura trocada de `verify(idToken: string)` para `verify(authCode: string)`; o retorno é o mesmo `Either` (task consumida por task-02)
  - `InMemoryGoogleAuthProvider.addValidCode(code: string, userInfo: GoogleUserInfo): void` — substitui `addValidToken(idToken, userInfo)`
  - `env.GOOGLE_CLIENT_SECRET: string | undefined` — nova chave opcional em `envSchema`

### Skills a invocar

- `no-workarounds`: superfície de segurança (troca de code por tokens no servidor, guarda de env). Nenhum atalho — se `getToken` ou `verifyIdToken` não derem conta, corrige-se a raiz, não se engole a falha nem se faz cast de tipo.
- `typescript-advanced`: o contrato genérico `Either<InvalidGoogleTokenError, GoogleUserInfo>` atravessa provider, use cases e controllers; preserve a nulabilidade de `tokens.id_token` (`Credentials.id_token` é `string | null | undefined`) sem `as`.
- `context7`: confirmar a API real de `google-auth-library` — `OAuth2Client.getToken` e `OAuth2Client.verifyIdToken` — antes de escrever o `GoogleAuthProviderImpl`, em vez de assumir a forma do briefing.

## Passos

- **Step 0: Confirmar a assinatura de `getToken` antes de escrever o teste**

  Abra `apps/backend/node_modules/google-auth-library/build/src/auth/oauth2client.d.ts` e confirme, por leitura, três fatos — não rode código para descobrir isto:

  1. `getToken(options: GetTokenOptions): Promise<GetTokenResponse>` e `GetTokenOptions` declara `code: string`, `codeVerifier?`, `client_id?`, `redirect_uri?` — **não** declara `client_secret`; o secret entra pelo construtor `new OAuth2Client(clientId, clientSecret)`.
  2. `GetTokenResponse` é `{ tokens: Credentials; res: GaxiosResponse | null }`, e `Credentials.id_token` é opcional (`string | null | undefined`).
  3. `verifyIdToken(options: VerifyIdTokenOptions)` recebe `{ idToken, audience }`.

  Se a typings instalada divergir do que está acima, adapte os passos 1–8 a ela e diga a divergência no commit; não escreva `getToken({ code, client_id, client_secret })`, que não compila.

- **Step 1: Write the failing test**

  Reescreva `apps/backend/src/session/infra/provider/google-auth-provider-impl.test.ts` inteiro. O padrão `vi.doMock` + `loadSut()` do arquivo é preservado; os mocks passam de `verifyIdToken` para `getToken` + `verifyIdToken`, e o env mock passa a expor `GOOGLE_CLIENT_SECRET`. O parâmetro de env usa `null` (e não `undefined`) como sentinela de "ausente", porque um default declarado desengoliria `undefined`.

```ts
interface LoadSutOptions {
	googleClientId?: string | null
	googleClientSecret?: string | null
	payload?: {
		sub?: string
		email?: string
		name?: string
		email_verified?: boolean
	}
	tokens?: { id_token?: string }
	getTokenError?: Error
}

describe("GoogleAuthProviderImpl", () => {
	afterEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
		vi.doUnmock("google-auth-library")
		vi.doUnmock("@/shared/infra/env/index.js")
	})

	test("AC-03 deve trocar o authorization code por tokens e verificar o id_token com aud = GOOGLE_CLIENT_ID", async () => {
		const { sut, getTokenSpy, verifyIdTokenSpy } = await loadSut({
			payload: {
				sub: "google-user-1",
				email: "john@doe.com",
				name: "John Doe",
				email_verified: true,
			},
		})

		const result = await sut.verify("auth-code-123")

		expect(getTokenSpy).toHaveBeenCalledWith({
			code: "auth-code-123",
			client_id: "google-client-id",
		})
		expect(verifyIdTokenSpy).toHaveBeenCalledWith({
			idToken: "google-id-token",
			audience: "google-client-id",
		})
		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual({
			sub: "google-user-1",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})
	})

	test("deve retornar InvalidGoogleTokenError quando a troca não devolver id_token", async () => {
		const { sut, verifyIdTokenSpy, InvalidGoogleTokenError } = await loadSut({
			tokens: {},
			payload: { sub: "google-user-1", email: "john@doe.com", name: "John Doe" },
		})

		const result = await sut.verify("auth-code-123")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
		expect(verifyIdTokenSpy).not.toHaveBeenCalled()
	})

	test("deve retornar InvalidGoogleTokenError quando o payload estiver incompleto", async () => {
		const { sut, InvalidGoogleTokenError } = await loadSut({
			payload: { sub: "google-user-1", email: "john@doe.com" },
		})

		const result = await sut.verify("auth-code-123")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
	})

	test("deve retornar success com emailVerified=false quando e-mail não for verificado", async () => {
		const { sut } = await loadSut({
			payload: {
				sub: "google-user-1",
				email: "john@doe.com",
				name: "John Doe",
				email_verified: false,
			},
		})

		const result = await sut.verify("auth-code-123")

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({ emailVerified: false })
	})
})

async function loadSut({
	googleClientId = "google-client-id",
	googleClientSecret = "google-client-secret",
	payload,
	tokens = { id_token: "google-id-token" },
	getTokenError,
}: LoadSutOptions = {}) {
	const getTokenSpy = vi.fn(async (_options: unknown) => {
		if (getTokenError) {
			throw getTokenError
		}

		return { tokens, res: null }
	})

	const verifyIdTokenSpy = vi.fn(async (_options: unknown) => ({
		getPayload: () => payload,
	}))

	vi.doMock("google-auth-library", () => ({
		OAuth2Client: class {
			public async getToken(options: unknown) {
				return getTokenSpy(options)
			}

			public async verifyIdToken(options: unknown) {
				return verifyIdTokenSpy(options)
			}
		},
	}))

	vi.doMock("@/shared/infra/env/index.js", () => ({
		env: {
			GOOGLE_CLIENT_ID: googleClientId,
			GOOGLE_CLIENT_SECRET: googleClientSecret,
		},
	}))

	const [{ GoogleAuthProviderImpl }, { InvalidGoogleTokenError }] =
		await Promise.all([
			import("./google-auth-provider-impl.js"),
			import("@/session/application/error/invalid-google-token-error.js"),
		])

	return {
		sut: new GoogleAuthProviderImpl(),
		getTokenSpy,
		verifyIdTokenSpy,
		InvalidGoogleTokenError,
	}
}
```

- **Step 2: Run test to verify it fails**

  Run: `pnpm --filter backend exec vitest --run --config ./test/vite.config.app-domain.ts src/session/infra/provider/google-auth-provider-impl.test.ts`
  Expected: FAIL — a asserção `expect(getTokenSpy).toHaveBeenCalledWith({ code: "auth-code-123", client_id: "google-client-id" })` recebe `received 0` (o `GoogleAuthProviderImpl` atual chama `verifyIdToken` direto e nunca `getToken`); os casos de payload incompleto e `id_token` ausente passam por acidente e os demais falham nesta mesma execução.

- **Step 3: Review Focus: `GoogleAuthProviderImpl` deve falhar antes de qualquer chamada HTTP quando o env estiver ausente — `task-01` — Write the failing test**

  Acrescente ao mesmo arquivo os dois testes que fixam a guarda de env, antes de qualquer implementação:

```ts
	test("AC-07 deve retornar InvalidGoogleTokenError sem chamar o Google quando GOOGLE_CLIENT_SECRET não estiver configurado", async () => {
		const { sut, getTokenSpy, verifyIdTokenSpy, InvalidGoogleTokenError } =
			await loadSut({ googleClientSecret: null })

		const result = await sut.verify("auth-code-123")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
		expect(getTokenSpy).not.toHaveBeenCalled()
		expect(verifyIdTokenSpy).not.toHaveBeenCalled()
	})

	test("AC-07 deve retornar InvalidGoogleTokenError sem chamar o Google quando GOOGLE_CLIENT_ID não estiver configurado", async () => {
		const { sut, getTokenSpy, verifyIdTokenSpy, InvalidGoogleTokenError } =
			await loadSut({ googleClientId: null })

		const result = await sut.verify("auth-code-123")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
		expect(getTokenSpy).not.toHaveBeenCalled()
		expect(verifyIdTokenSpy).not.toHaveBeenCalled()
	})
```

- **Step 4: Run test to verify it fails**

  Run: `pnpm --filter backend exec vitest --run --config ./test/vite.config.app-domain.ts src/session/infra/provider/google-auth-provider-impl.test.ts -t "sem chamar o Google"`
  Expected: FAIL — `expect(getTokenSpy).not.toHaveBeenCalled()` recebe `received 1` com o `GOOGLE_CLIENT_SECRET` ausente, porque o `GoogleAuthProviderImpl` atual só guarda `GOOGLE_CLIENT_ID`.

- **Step 5: Review Focus: Code válido porém já consumido: o provider precisa devolver `InvalidGoogleTokenError` (não um erro genérico) para que a resposta siga `401` — `task-01` — Write the failing test**

  Acrescente o teste do code já consumido, no mesmo arquivo:

```ts
	test("AC-06 deve retornar InvalidGoogleTokenError quando o authorization code já foi consumido", async () => {
		const { sut, verifyIdTokenSpy, InvalidGoogleTokenError } = await loadSut({
			getTokenError: Object.assign(new Error("invalid_grant"), {
				code: "invalid_grant",
			}),
		})

		const result = await sut.verify("already-used-code")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
		expect(result.forceFailure().value.name).toBe("InvalidGoogleTokenError")
		expect(verifyIdTokenSpy).not.toHaveBeenCalled()
	})
```

- **Step 6: Run test to verify it fails**

  Run: `pnpm --filter backend exec vitest --run --config ./test/vite.config.app-domain.ts src/session/infra/provider/google-auth-provider-impl.test.ts -t "já foi consumido"`
  Expected: FAIL — o `catch` atual devolve `InvalidGoogleTokenError` mas só depois de passar por `verifyIdToken`, então a asserção `expect(verifyIdTokenSpy).not.toHaveBeenCalled()` recebe `received 1`; se o `catch` deixar de existir, o teste estoura com a rejeição de `invalid_grant` não tratada.

- **Step 7: Write minimal implementation**

  1. Em `apps/backend/src/session/application/provider/google-auth-provider.ts`, troque apenas o nome do parâmetro — a forma do `Either` não muda:

```ts
export interface GoogleAuthProvider {
	verify(
		authCode: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>>
}
```

  2. Em `apps/backend/src/shared/infra/env/env-schema.ts`, acrescente `GOOGLE_CLIENT_SECRET` logo abaixo de `GOOGLE_CLIENT_ID` (linha 21). Opcional, para não derrubar o boot do backend em ambientes que só rodam login por e-mail:

```ts
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
```

  3. Em `apps/backend/src/session/infra/provider/google-auth-provider-impl.ts`, o client secret entra pelo construtor do `OAuth2Client` e o `verify` troca o code antes de verificar o `id_token`:

```ts
@injectable()
export class GoogleAuthProviderImpl implements GoogleAuthProvider {
	private readonly client: OAuth2Client
	private readonly googleClientId = env.GOOGLE_CLIENT_ID
	private readonly googleClientSecret = env.GOOGLE_CLIENT_SECRET

	constructor() {
		this.client = new OAuth2Client(this.googleClientId, this.googleClientSecret)
	}

	public async verify(
		authCode: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>> {
		if (!this.googleClientId || !this.googleClientSecret) {
			return failure(new InvalidGoogleTokenError())
		}
		try {
			const { tokens } = await this.client.getToken({
				code: authCode,
				client_id: this.googleClientId,
			})
			if (!tokens.id_token) {
				return failure(new InvalidGoogleTokenError())
			}
			const ticket = await this.client.verifyIdToken({
				idToken: tokens.id_token,
				audience: this.googleClientId,
			})
			const payload = ticket.getPayload()
			if (!payload?.sub || !payload.email || !payload.name) {
				return failure(new InvalidGoogleTokenError())
			}
			return success({
				sub: payload.sub,
				email: payload.email,
				name: payload.name,
				emailVerified: payload.email_verified ?? false,
			})
		} catch {
			return failure(new InvalidGoogleTokenError())
		}
	}
}
```

- **Step 8: Run test to verify it passes**

  Run: `pnpm --filter backend exec vitest --run --config ./test/vite.config.app-domain.ts src/session/infra/provider/google-auth-provider-impl.test.ts`
  Expected: PASS — 7 testes passaram, 0 falharam.

- **Step 9: Write the failing test**

  Reescreva `apps/backend/src/session/infra/provider/in-memory-google-auth-provider.test.ts` para o authorization code:

```ts
import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import type { GoogleUserInfo } from "@/session/application/provider/google-auth-provider.js"

import { InMemoryGoogleAuthProvider } from "./in-memory-google-auth-provider.js"

describe("InMemoryGoogleAuthProvider", () => {
	test("deve retornar o usuário Google quando o authorization code for válido", async () => {
		const sut = new InMemoryGoogleAuthProvider()
		const userInfo: GoogleUserInfo = {
			sub: "google-user-1",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		}

		sut.addValidCode("valid-code", userInfo)

		const result = await sut.verify("valid-code")

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual(userInfo)
	})

	test("deve retornar InvalidGoogleTokenError quando o authorization code não for válido", async () => {
		const sut = new InMemoryGoogleAuthProvider()

		const result = await sut.verify("invalid-code")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
	})
})
```

- **Step 10: Run test to verify it fails**

  Run: `pnpm --filter backend exec vitest --run --config ./test/vite.config.app-domain.ts src/session/infra/provider/in-memory-google-auth-provider.test.ts`
  Expected: FAIL — `sut.addValidCode is not a function`, porque a implementação ainda expõe `addValidToken`.

- **Step 11: Write minimal implementation**

  Em `apps/backend/src/session/infra/provider/in-memory-google-auth-provider.ts`, renomeie o método e o `Map`; o corpo da resolução não muda:

```ts
@injectable()
export class InMemoryGoogleAuthProvider implements GoogleAuthProvider {
	private readonly validCodes = new Map<string, GoogleUserInfo>()

	public addValidCode(code: string, userInfo: GoogleUserInfo): void {
		this.validCodes.set(code, userInfo)
	}

	public async verify(
		code: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>> {
		const userInfo = this.validCodes.get(code)

		if (!userInfo) {
			return failure(new InvalidGoogleTokenError())
		}

		return success(userInfo)
	}
}
```

- **Step 12: Run test to verify it passes**

  Run: `pnpm --filter backend exec vitest --run --config ./test/vite.config.app-domain.ts src/session/infra/provider/in-memory-google-auth-provider.test.ts`
  Expected: PASS — 2 testes passaram, 0 falharam.

- **Step 13: Write the failing test**

  A rota de seam `POST /sessions/dev/google-token` semeia o `InMemoryGoogleAuthProvider` com a identidade que o `POST /sessions/google` vai consumir. Como o provider passa a ser indexado por authorization code, o corpo da seeding também passa a falar em `code`. Em `apps/backend/src/session/infra/controller/dev-google-token.business-flow-test.ts`, renomeie o campo semeado de `idToken` para `code` nos três testes — a chamada de login em `SessionRoutes.AUTHENTICATE_GOOGLE` **continua** com `{ idToken: "seeded-token" }`, porque o `POST /sessions/google` só troca de campo na task-02:

```ts
	test("Deve registrar um authorization code Google válido em ambiente não produtivo", async () => {
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.DEV_GOOGLE_TOKEN)
			.send({
				code: "seeded-google-code",
				sub: "google-sub-123",
				email: "google-only@example.com",
				name: "Google Only",
				emailVerified: true,
			})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ ok: true })
	})

	test("Deve permitir login com Google usando o code previamente registrado", async () => {
		await request(fastifyServer.server)
			.post(SessionRoutes.DEV_GOOGLE_TOKEN)
			.send({
				code: "seeded-token",
				sub: "google-sub-456",
				email: "seeded@example.com",
				name: "Seeded User",
				emailVerified: true,
			})

		const loginResponse = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "seeded-token" })

		expect(loginResponse.status).toBe(HTTP_STATUS.OK)
		expect(loginResponse.body).toHaveProperty("token")
	})

	test("Deve retornar 400 quando body inválido", async () => {
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.DEV_GOOGLE_TOKEN)
			.send({ code: "" })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})
```

- **Step 14: Run test to verify it fails**

  Run: `pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/session/infra/controller/dev-google-token.business-flow-test.ts`
  Expected: FAIL — "Deve registrar um authorization code Google válido em ambiente não produtivo" recebe `expected 201, received 400`, porque o schema Zod da rota ainda exige `idToken: z.string().min(1)`; "Deve permitir login com Google usando o code previamente registrado" recebe `expected 200, received 400` pelo mesmo motivo.

- **Step 15: Write minimal implementation**

  Em `apps/backend/src/session/infra/controller/dev-google-token.controller.ts`, renomeie o campo do schema e a chamada do provider. O guard `instanceof InMemoryGoogleAuthProvider` que decide se a rota existe e o `ResponseFactory.CREATED` ficam como estão:

```ts
const devGoogleTokenBodySchema = z.object({
	code: z.string().min(1),
	sub: z.string().min(1),
	email: z.email(),
	name: z.string().min(1),
	emailVerified: z.boolean().default(true),
})
```

```ts
		this.googleAuthProvider.addValidCode(parsedBody.value.code, {
			sub: parsedBody.value.sub,
			email: parsedBody.value.email,
			name: parsedBody.value.name,
			emailVerified: parsedBody.value.emailVerified,
		})
```

- **Step 16: Run test to verify it passes**

  Run: `pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/session/infra/controller/dev-google-token.business-flow-test.ts`
  Expected: PASS — 3 testes passaram, 0 falharam.

- **Step 17: Commit**

```bash
git add apps/backend/src/session/application/provider/google-auth-provider.ts \
  apps/backend/src/session/infra/provider/google-auth-provider-impl.ts \
  apps/backend/src/session/infra/provider/google-auth-provider-impl.test.ts \
  apps/backend/src/session/infra/provider/in-memory-google-auth-provider.ts \
  apps/backend/src/session/infra/provider/in-memory-google-auth-provider.test.ts \
  apps/backend/src/session/infra/controller/dev-google-token.controller.ts \
  apps/backend/src/session/infra/controller/dev-google-token.business-flow-test.ts \
  apps/backend/src/shared/infra/env/env-schema.ts
git commit -m "feat(auth): provider Google troca authorization code por tokens"
```

## Critérios de Sucesso

- `GoogleAuthProvider.verify` recebe `authCode` e nenhum call site passa mais um ID token; o tipo de retorno continua `Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>>`
- `GoogleAuthProviderImpl` chama `getToken` com o authorization code recebido e `verifyIdToken` com `audience` igual ao `GOOGLE_CLIENT_ID` do env
- `GOOGLE_CLIENT_ID` **e** `GOOGLE_CLIENT_SECRET` ausentes produzem `InvalidGoogleTokenError` com `getToken` e `verifyIdToken` não chamados
- Code inválido, expirado ou já consumido (`invalid_grant`) produz `InvalidGoogleTokenError` com `name` igual a `InvalidGoogleTokenError`, que é o que o controller mapeia para `401`
- Resposta de token sem `id_token`, ou payload sem `sub`/`email`/`name`, produz `InvalidGoogleTokenError`
- `GoogleAuthProviderImpl` não recebe nenhum segredo por parâmetro nem expõe `client_secret` fora do backend
- `envSchema` declara `GOOGLE_CLIENT_SECRET` como opcional — nenhum ambiente existente deixa de fazer boot
- `InMemoryGoogleAuthProvider` expõe `addValidCode(code, userInfo)` e remove `addValidToken`
- A rota de seam `POST /sessions/dev/google-token` semeia o provider com `addValidCode(code, …)` e valida `{ code, sub, email, name, emailVerified }`
- AC-03 [unit]: WHEN `code` é trocado no backend THEN o `id_token` é verificado com `aud = GOOGLE_CLIENT_ID` e o caso de uso recebe `GoogleUserInfo`
- AC-06 [unit]: WHEN o code é inválido ou expirado THEN a resposta é `401` e nenhum usuário é criado
- AC-07 [unit]: WHEN falta `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` no backend THEN a verificação falha sem chamada ao Google