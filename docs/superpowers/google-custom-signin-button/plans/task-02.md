# Task 2: Controllers de sessão e reautenticação aceitam `{ code }` [FR-002, FR-003, FR-006]

**Status:** PENDING

**PRD:** `../prd/prd-google-custom-signin-button.md`

**Spec:** `../specs/google-custom-signin-button-design.md`

**Tier:** capable

## Visão Geral

O contrato HTTP das duas operações que recebem a prova do Google passa de `{ idToken }` para `{ code }`: o schema Zod, os metadados OpenAPI e a entrada dos dois use cases. Toda a regra de resolução de usuário — por `googleId`, depois por e-mail, depois criando a conta — e as regras do grant de reautenticação permanecem intactas; o corpo antigo com `idToken` passa a cair em `400` de validação, não em falha de provider.

## Arquivos

- Modify: `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts`
- Modify: `apps/backend/src/session/infra/controller/authenticate-with-google.controller.ts`
- Modify: `apps/backend/src/user/application/use-case/create-password-reauth-grant.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/create-password-reauth-grant.controller.ts`
- Test: `apps/backend/src/session/infra/controller/authenticate-with-google.business-flow-test.ts`
- Test: `apps/backend/src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts`
- Test: `apps/backend/src/user/infra/controller/define-password.business-flow-test.ts`

## Interfaces

- **Consome:** `GoogleAuthProvider.verify(authCode: string): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>>` (task-01) e `InMemoryGoogleAuthProvider.addValidCode(code: string, userInfo: GoogleUserInfo): void` (task-01)
- **Produz:**
  - `AuthenticateWithGoogleUseCaseInput { code: string }` — substitui `{ idToken: string }`; consumida por `authenticate-with-google.controller.ts` e, nos business-flows, como `authenticateWithGoogle.execute({ code })`
  - `CreatePasswordReauthGrantUseCaseInput { userId: string; provider: "google"; code: string }` — substitui `{ userId, provider, idToken }`

### Skills a invocar

- `no-workarounds`: superfície de segurança com casos de erro. `400` por corpo inválido e `401` por code inválido são caminhos distintos e nenhum deles pode ser "normalizado" com cast, `any` ou `eslint-disable`.
- `zod`: os schemas de request (`z.object`, `z.string().min(1)`, `z.enum(["google"])`) e os metadados OpenAPI (`description`, `example`) vivem no mesmo objeto; o corpo antigo precisa ser rejeitado pelo schema, não pelo provider.
- `typescript-advanced`: `Pick<CreatePasswordReauthGrantUseCaseInput, "code">` e o encadeamento de `Either` entre provider e use cases precisam continuar tipados sem `as`.
- `test-antipatterns`: os business-flows usam `container.snapshot()` / `container.restore()` e um provider in-memory real; o teste precisa provar o contrato HTTP, não o comportamento do `InMemoryGoogleAuthProvider`.

## Passos

- **Step 1: Review Focus: O corpo antigo `{ idToken }` precisa cair em `400` de validação, não em falha de provider — `task-02` — Write the failing test**

  Em `apps/backend/src/session/infra/controller/authenticate-with-google.business-flow-test.ts`, troque as fixtures de token por code — `googleAuthProvider.addValidToken("valid-token", …)` vira `googleAuthProvider.addValidCode("valid-code", …)` em todos os testes, e `.send({ idToken: "valid-token" })` vira `.send({ code: "valid-code" })` — e acrescente, no fim do `describe`, o teste do corpo antigo. Cada `test(...)` deste arquivo passa a carregar o id do AC que prova:

```ts
	test("AC-03 Deve autenticar usuário existente com googleId", …)
	test("AC-06 Deve retornar 401 quando code Google for inválido", …)
	test("AC-08 Deve retornar 422 quando email Google não for verificado", …)
	test("AC-09 Deve retornar 409 com code external_account_link_required quando o email já existir sem googleId", …)
	test("AC-10 Deve retornar 400 quando o corpo trouxer idToken em vez de code", …)
```

O corpo do novo teste:

```ts
	test("AC-10 Deve retornar 400 quando o corpo trouxer idToken em vez de code", async () => {
		await createAndSaveUser({
			userRepository,
			email: "john@doe.com",
			googleId: "google-sub-123",
			name: "John Doe",
		})
		googleAuthProvider.addValidCode("valid-code", {
			sub: "google-sub-123",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})

		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "valid-token" })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body).toHaveProperty("message")
	})
```

- **Step 2: Run test to verify it fails**

  Run: `pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/session/infra/controller/authenticate-with-google.business-flow-test.ts`
  Expected: FAIL — `expected 401, received 400` em "Deve retornar 401 quando code Google for inválido": o schema Zod ainda exige `idToken`, então `{ code: "invalid-code" }` é rejeitado na validação antes de chegar ao provider, e o mesmo `400` faz "Deve autenticar usuário existente com googleId" falhar com `expected 200, received 400`.

- **Step 3: Review Focus: `CreatePasswordReauthGrantUseCase` continua devolvendo grant de 300 s e recusando reuso — `task-02` — Write the failing test**

  Em `apps/backend/src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts`, aplique a mesma troca de fixture (`addValidToken("reauth-token", …)` → `addValidCode("reauth-code", …)`, `authenticateWithGoogle.execute({ idToken: "reauth-token" })` → `execute({ code: "reauth-code" })`, `.send({ provider: "google", idToken: "reauth-token" })` → `.send({ provider: "google", code: "reauth-code" })`) e acrescente o teste que fixa o TTL de 300 s e a recusa de reuso. O `test(...)` que já existe no arquivo passa a se chamar `test("Deve retornar reauthGrant válido para conta Google sem senha local", …)` — sem id, porque ele é a reencarnação do caso feliz; o novo teste abaixo é o que fixa o Review Focus:

```ts
	test("Deve recusar o reuso do grant de reautenticação", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google-reuse@doe.com",
			googleId: "google-sub-reuse",
		})
		googleAuthProvider.addValidCode("reauth-code", {
			sub: "google-sub-reuse",
			email: user.email,
			name: user.name,
			emailVerified: true,
		})
		const token = (
			await authenticateWithGoogle.execute({ code: "reauth-code" })
		).force.success().value.token

		const reauthResponse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD_REAUTH)
			.set("Authorization", `Bearer ${token}`)
			.send({ provider: "google", code: "reauth-code" })

		const firstUse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD)
			.set("Authorization", `Bearer ${token}`)
			.send({
				provider: "google",
				reauthGrant: reauthResponse.body.reauthGrant,
				newRawPassword: "Senha123!",
			})
		const secondUse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD)
			.set("Authorization", `Bearer ${token}`)
			.send({
				provider: "google",
				reauthGrant: reauthResponse.body.reauthGrant,
				newRawPassword: "Senha456!",
			})

		expect(reauthResponse.status).toBe(HTTP_STATUS.OK)
		expect(reauthResponse.body).toEqual({
			reauthGrant: expect.any(String),
			expiresInSeconds: 300,
		})
		expect(firstUse.status).toBe(HTTP_STATUS.NO_CONTENT)
		expect(secondUse.status).toBe(HTTP_STATUS.CONFLICT)
		expect(secondUse.body).toMatchObject({ code: "reauth_grant_invalid" })
	})
```

- **Step 4: Run test to verify it fails**

  Run: `pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts`
  Expected: FAIL — `expected 400, received 200` no fluxo principal e, no novo teste, `expected 409, received 400` na segunda apresentação do grant: o schema Zod de `POST /users/me/password/reauth` ainda exige `idToken`, então o `.send({ provider, code })` não passa da validação.

- **Step 5: Write minimal implementation**

  1. `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts` — o input e a chamada ao provider; `resolveUser`, `resolveByEmail`, `linkAndAuthenticate`, `createAndAuthenticate`, os eventos e `createAuthTokenOutput` ficam intactos:

```ts
export interface AuthenticateWithGoogleUseCaseInput {
	code: string
}
```

```ts
		const googleUserInfoResult = await this.googleAuthProvider.verify(input.code)
```

  2. `apps/backend/src/session/infra/controller/authenticate-with-google.controller.ts` — schema do corpo e a linha do `execute`. `mapResponseError` não muda: `InvalidGoogleTokenError → 401`, `GoogleEmailNotVerifiedError → 422`, `ExternalProviderLinkRequiredError → 409 external_account_link_required`, `GoogleAccountAlreadyLinkedError → 409`:

```ts
const authenticateWithGoogleRequestSchema = z.object({
	code: z.string().min(1).meta({
		description: "Google authorization code (single use, ~2 min validity)",
		example: "4/0AVMBsJi8_example-authorization-code",
	}),
})
```

```ts
		const result = await this.authenticateWithGoogleUseCase.execute({
			code: parsedBodyResult.value.code,
		})
```

  3. `apps/backend/src/user/application/use-case/create-password-reauth-grant.usecase.ts` — input, o `Pick<>` de `validateGoogleReauth` e a chamada ao provider; `findEligibleUser`, `isProviderLinked` e o TTL de `PASSWORD_REAUTH_GRANT_TTL_IN_SECONDS = 300` ficam intactos:

```ts
export interface CreatePasswordReauthGrantUseCaseInput {
	userId: string
	provider: "google"
	code: string
}
```

```ts
	private async validateGoogleReauth(
		input: Pick<CreatePasswordReauthGrantUseCaseInput, "code">,
		googleId: string,
	): Promise<
```

```ts
		const googleUserInfoResult = await this.googleAuthProvider.verify(input.code)
```

  4. `apps/backend/src/user/infra/controller/create-password-reauth-grant.controller.ts` — schema do corpo e a linha do `execute`:

```ts
const createPasswordReauthGrantSchema = z.object({
	provider: z.enum(["google"]).meta({
		description: "External provider linked to the account",
		example: "google",
	}),
	code: z.string().min(1).meta({
		description:
			"Fresh provider authorization code used for recent reauthentication",
		example: "4/0AVMBsJi8_example-authorization-code",
	}),
})
```

```ts
		const result = await this.createPasswordReauthGrant.execute({
			userId: req.user.sub.id,
			provider: parsedBodyOrError.value.provider,
			code: parsedBodyOrError.value.code,
		})
```

  5. Atualize a `description` do `OpenApiSchemaBuilder` em `authenticate-with-google.controller.ts`, que ainda fala em "Google ID token":

```ts
		description:
			"Exchange a Google authorization code for tokens on the server and return a JWT token plus the refresh token cookie",
```

- **Step 6: Run test to verify it passes**

  Run: `pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/session/infra/controller/authenticate-with-google.business-flow-test.ts`
  Expected: PASS — 7 testes passaram, 0 falharam.

- **Step 7: Run test to verify it passes**

  Run: `pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts`
  Expected: PASS — 2 testes passaram, 0 falharam.

- **Step 8: Sincronizar a fixture de `define-password.business-flow-test.ts`**

  Em `apps/backend/src/user/infra/controller/define-password.business-flow-test.ts`, este arquivo não muda de comportamento — só fala do novo contrato. Troque `googleAuthProvider.addValidToken("reauth-token", …)` por `addValidCode("reauth-code", …)`, `authenticateWithGoogle.execute({ idToken: "reauth-token" })` por `execute({ code: "reauth-code" })` e `.send({ provider: "google", idToken: "reauth-token" })` por `.send({ provider: "google", code: "reauth-code" })`. Deixe `UserRoutes.PASSWORD`, `SessionRoutes.AUTHENTICATE` e as asserções de status como estão.

- **Step 9: Run test to verify it passes**

  Run: `pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/define-password.business-flow-test.ts`
  Expected: PASS — 1 teste passou, 0 falharam.

- **Step 10: Commit**

```bash
git add apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts \
  apps/backend/src/session/infra/controller/authenticate-with-google.controller.ts \
  apps/backend/src/session/infra/controller/authenticate-with-google.business-flow-test.ts \
  apps/backend/src/user/application/use-case/create-password-reauth-grant.usecase.ts \
  apps/backend/src/user/infra/controller/create-password-reauth-grant.controller.ts \
  apps/backend/src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts \
  apps/backend/src/user/infra/controller/define-password.business-flow-test.ts
git commit -m "feat(auth): endpoints de sessão e reautenticação aceitam { code }"
```

## Critérios de Sucesso

- `AuthenticateWithGoogleUseCaseInput` e `CreatePasswordReauthGrantUseCaseInput` aceitam `code`; nenhum campo `idToken` permanece nos dois caminhos
- Nenhum teste, controller ou use case aceita um ID token cru: `POST /sessions/google` com `{ idToken }` responde `400`
- `AuthenticateWithGoogleUseCase` mantém a resolução por `googleId`, por e-mail, criando a conta, os eventos de domínio e o `AuthTokenOutputDTO` — a task não altera nenhuma dessas regras
- `CreatePasswordReauthGrantUseCase` continua devolvendo `expiresInSeconds: 300` e um grant recusado na segunda apresentação com `409 reauth_grant_invalid`
- `mapResponseError` dos dois controllers está inalterado: `InvalidGoogleTokenError → 401`, `GoogleEmailNotVerifiedError → 422`, `ExternalProviderLinkRequiredError → 409 external_account_link_required`, `GoogleAccountAlreadyLinkedError → 409`
- Os schemas OpenAPI de `POST /sessions/google` e `POST /users/me/password/reauth` descrevem e exemplificam `code`, e a descrição do primeiro não diz mais "Google ID token"
- Nenhum segredo do Google aparece na resposta HTTP nem no log do controller
- `| POST /sessions/google` (corpo trocado de `{ idToken }` para `{ code }`) | `{ code: string, min 1 }` — authorization code, consumível uma vez | `200 { token, refreshToken }` + cookie `refresh` httpOnly | `401` token/code inválido; `422` e-mail Google não verificado; `409` `external_account_link_required`; `400` corpo inválido |
- `| POST /users/me/password/reauth` (corpo trocado de `{ provider, idToken }` para `{ provider, code }`) | `{ provider: "google", code: string, min 1 }` | `200 { reauthGrant, expiresInSeconds }` — `reauthGrant` expira em `expiresInSeconds` (300 s) e não pode ser reapresentado | `401` code inválido; `400` corpo inválido |
- AC-03 [int]: WHEN `code` é trocado no backend THEN o `id_token` é verificado com `aud = GOOGLE_CLIENT_ID` e o caso de uso recebe `GoogleUserInfo`
- AC-06 [int]: WHEN o code é inválido ou expirado THEN a resposta é `401` e nenhum usuário é criado
- AC-08 [int]: WHEN o e-mail Google não está verificado THEN a resposta é `422`
- AC-09 [int]: WHEN o e-mail pertence a conta sem Google vinculado THEN a resposta é `409 external_account_link_required`
- AC-10 [int]: WHEN o body traz `idToken` em vez de `code` THEN a resposta é `400` de validação