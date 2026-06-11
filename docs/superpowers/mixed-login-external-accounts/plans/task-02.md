# Task 2: Expor capacidades de credencial e bloquear linking inseguro [RF-001, RF-011]

**Status:** DONE
**PRD:** `../prd/prd-mixed-login-external-accounts.md`
**Spec:** `../specs/mixed-login-external-accounts-design.md`

## Visão Geral

Adicionar ao backend o estado explícito de credenciais da conta (`hasPassword` e `authMethods`) e impedir que o login com Google continue vinculando uma conta existente apenas pelo e-mail. Esse task prepara os contratos que o frontend vai consumir e fecha um ponto de segurança antes do fluxo novo. O retorno `409 external_account_link_required` é intencional nesta etapa; um fluxo autenticado de linking não faz parte deste plano.

## Arquivos

- Create: `apps/backend/src/session/application/error/external-provider-link-required-error.ts`
- Modify: `apps/backend/src/user/application/use-case/user-profile.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/my-profile.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/user-profile.controller.ts`
- Modify: `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts`
- Modify: `apps/backend/src/session/infra/controller/authenticate-with-google.controller.ts`
- Modify/Test: `apps/backend/src/user/application/use-case/user-profile.usecase.test.ts`
- Modify/Test: `apps/backend/src/user/infra/controller/my-profile.business-flow-test.ts`
- Modify/Test: `apps/backend/src/user/infra/controller/user-profile.business-flow-test.ts`
- Modify/Test: `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.test.ts`
- Modify/Test: `apps/backend/src/session/infra/controller/authenticate-with-google.business-flow-test.ts`

## Conformidade com as Competências Padrão

- `systematic-debugging`
- `no-workarounds`
- `test-driven-development`
- `test-antipatterns`
- `context7`

## Passos

- [ ] **Step 1: Write the failing test**

```ts
// Replace the current "deve vincular conta Google a usuário existente pelo email"
// expectations instead of keeping both behaviors side by side.

// apps/backend/src/user/application/use-case/user-profile.usecase.test.ts
test("Deve expor hasPassword e authMethods no perfil do usuário", async () => {
	const user = await createAndSaveUser({
		userRepository,
		email: "john@doe.com",
		password: "Senha123!",
	})

	const result = await sut.execute({ userId: user.id })

	expect(result.isSuccess()).toBe(true)
	expect(result.forceSuccess().value).toMatchObject({
		hasPassword: true,
		authMethods: ["password"],
	})
})

test("Deve expor authMethods apenas com google para conta externa sem senha", async () => {
	const user = await createAndSaveUser({
		userRepository,
		email: "google@doe.com",
		googleId: "google-sub-123",
	})

	const result = await sut.execute({ userId: user.id })

	expect(result.forceSuccess().value).toMatchObject({
		hasPassword: false,
		authMethods: ["google"],
	})
})

// apps/backend/src/user/infra/controller/my-profile.business-flow-test.ts
test("Deve retornar hasPassword e authMethods em GET /users/me", async () => {
	const user = await createAndSaveUser({
		userRepository,
		name: "any_name",
		email: "any@email.com",
		password: "any_password",
	})
	const token = (
		await authenticate.execute({
			email: user.email,
			password: "any_password",
		})
	).force.success().value.token

	const response = await request(fastifyServer.server)
		.get(UserRoutes.ME)
		.set("Authorization", `Bearer ${token}`)

	expect(response.status).toBe(HTTP_STATUS.OK)
	expect(response.body).toMatchObject({
		hasPassword: true,
		authMethods: ["password"],
	})
})

// apps/backend/src/session/application/use-case/authenticate-with-google.usecase.test.ts
import { ExternalProviderLinkRequiredError } from "@/session/application/error/external-provider-link-required-error.js"

test("deve exigir linking explícito quando encontrar email existente sem googleId", async () => {
	await createAndSaveUser({
		userRepository,
		email: "john@doe.com",
		name: "John Doe",
		password: "any_password",
	})
	googleAuthProvider.addValidToken("link-token", {
		sub: "google-sub-123",
		email: "john@doe.com",
		name: "John Doe",
		emailVerified: true,
	})

	const result = await sut.execute({ idToken: "link-token" })

	expect(result.isFailure()).toBe(true)
	expect(result.forceFailure().value).toBeInstanceOf(
		ExternalProviderLinkRequiredError,
	)
})

// apps/backend/src/session/infra/controller/authenticate-with-google.business-flow-test.ts
test("Deve retornar 409 com code external_account_link_required quando o email já existir sem googleId", async () => {
	await createAndSaveUser({
		userRepository,
		email: "john@doe.com",
		name: "John Doe",
		password: "any_password",
	})
	googleAuthProvider.addValidToken("link-token", {
		sub: "google-sub-123",
		email: "john@doe.com",
		name: "John Doe",
		emailVerified: true,
	})

	const response = await request(fastifyServer.server)
		.post(SessionRoutes.AUTHENTICATE_GOOGLE)
		.send({ idToken: "link-token" })

	expect(response.status).toBe(HTTP_STATUS.CONFLICT)
	expect(response.body).toEqual({
		code: "external_account_link_required",
		message: "Link this external account from an authenticated session first",
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:run -- src/user/application/use-case/user-profile.usecase.test.ts src/session/application/use-case/authenticate-with-google.usecase.test.ts && pnpm --filter backend test:business-flow -- src/user/infra/controller/my-profile.business-flow-test.ts src/user/infra/controller/user-profile.business-flow-test.ts src/session/infra/controller/authenticate-with-google.business-flow-test.ts`
Expected: FAIL porque o perfil ainda não retorna `hasPassword/authMethods` e o login com Google ainda vincula automaticamente uma conta existente encontrada apenas pelo e-mail.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/backend/src/session/application/error/external-provider-link-required-error.ts
export class ExternalProviderLinkRequiredError extends Error {
	constructor() {
		super("Link this external account from an authenticated session first")
		this.name = "ExternalProviderLinkRequiredError"
	}
}

// apps/backend/src/user/application/use-case/user-profile.usecase.ts
interface UserProfileUseCaseOutputDTO {
	id: string | null
	name: string
	email: string
	role: string
	hasPassword: boolean
	authMethods: string[]
}

private resolveAuthMethods(user: User): string[] {
	const methods: string[] = []
	if (user.password) methods.push("password")
	if (user.googleId) methods.push("google")
	return methods
}

return success({
	email: userOrNull.email,
	id: userOrNull.id,
	name: userOrNull.name,
	role: userOrNull.role,
	hasPassword: Boolean(userOrNull.password),
	authMethods: this.resolveAuthMethods(userOrNull),
})

// apps/backend/src/user/infra/controller/my-profile.controller.ts
const myProfileResponseSchema = z.object({
	id: z.string().meta({ description: "User ID", example: "uuid-1234" }),
	name: z.string().meta({ description: "User name", example: "John Doe" }),
	email: z.string().meta({ description: "User email", example: "john@example.com" }),
	role: z.string().meta({ description: "User role", example: "MEMBER" }),
	hasPassword: z.boolean().meta({ description: "Whether the account has a local password", example: false }),
	authMethods: z.array(z.string()).meta({ description: "Enabled authentication methods", example: ["google"] }),
})

// apps/backend/src/user/infra/controller/user-profile.controller.ts
const userProfileResponseSchema = z.object({
	id: z.string().meta({ description: "User ID", example: "uuid-1234" }),
	name: z.string().meta({ description: "User name", example: "John Doe" }),
	email: z.string().meta({ description: "User email", example: "john@example.com" }),
	role: z.string().meta({ description: "User role", example: "MEMBER" }),
	hasPassword: z.boolean().meta({ description: "Whether the account has a local password", example: true }),
	authMethods: z.array(z.string()).meta({ description: "Enabled authentication methods", example: ["password", "google"] }),
})

// apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts
import { ExternalProviderLinkRequiredError } from "@/session/application/error/external-provider-link-required-error.js"

export type AuthenticateWithGoogleUseCaseOutput = Either<
	| InvalidGoogleTokenError
	| GoogleEmailNotVerifiedError
	| GoogleAccountAlreadyLinkedError
	| ExternalProviderLinkRequiredError,
	AuthTokenOutputDTO
>

private async resolveByEmail(
	googleUserInfo: GoogleUserInfo,
): Promise<AuthenticateWithGoogleUseCaseOutput> {
	const userByEmail = await this.userRepository.userOfEmail(googleUserInfo.email)
	if (userByEmail) {
		if (!userByEmail.googleId) {
			return failure(new ExternalProviderLinkRequiredError())
		}
		return this.linkAndAuthenticate(userByEmail, googleUserInfo.sub)
	}
	return this.createAndAuthenticate(googleUserInfo)
}

// apps/backend/src/session/infra/controller/authenticate-with-google.controller.ts
if (error.name === "ExternalProviderLinkRequiredError") {
	return ResponseFactory.CONFLICT({
		code: "external_account_link_required",
		message: "Link this external account from an authenticated session first",
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run -- src/user/application/use-case/user-profile.usecase.test.ts src/session/application/use-case/authenticate-with-google.usecase.test.ts && pnpm --filter backend test:business-flow -- src/user/infra/controller/my-profile.business-flow-test.ts src/user/infra/controller/user-profile.business-flow-test.ts src/session/infra/controller/authenticate-with-google.business-flow-test.ts`
Expected: PASS, com os endpoints de perfil retornando `hasPassword/authMethods` e o login com Google recusando o linking automático por e-mail com `code: "external_account_link_required"`.

- [ ] **Step 5: Ask for commit approval and commit**

```bash
git add \
  apps/backend/src/session/application/error/external-provider-link-required-error.ts \
  apps/backend/src/user/application/use-case/user-profile.usecase.ts \
  apps/backend/src/user/infra/controller/my-profile.controller.ts \
  apps/backend/src/user/infra/controller/user-profile.controller.ts \
  apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts \
  apps/backend/src/session/infra/controller/authenticate-with-google.controller.ts \
  apps/backend/src/user/application/use-case/user-profile.usecase.test.ts \
  apps/backend/src/user/infra/controller/my-profile.business-flow-test.ts \
  apps/backend/src/user/infra/controller/user-profile.business-flow-test.ts \
  apps/backend/src/session/application/use-case/authenticate-with-google.usecase.test.ts \
  apps/backend/src/session/infra/controller/authenticate-with-google.business-flow-test.ts

# Somente depois da permissão explícita do usuário:
git commit -m "feat: expose account capabilities and block unsafe linking"
```

## Critérios de Sucesso

- `GET /users/me` e `GET /users/:userId` retornam `hasPassword` e `authMethods`.
- O login com Google deixa de vincular silenciosamente contas encontradas apenas pelo e-mail.
- O retorno `409 external_account_link_required` fica documentado como comportamento intencional enquanto um fluxo autenticado de linking continuar fora de escopo.
- Os contratos novos continuam compatíveis com a geração de OpenAPI que será executada no task de frontend.
