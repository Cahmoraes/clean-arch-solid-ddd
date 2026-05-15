# Task 3: Implementar reautenticação e definição da primeira senha no backend [RF-004, RF-005, RF-006, RF-007, RF-012, RF-013]

**Status:** DONE
**PRD:** `../prd/prd-mixed-login-external-accounts.md`
**Spec:** `../specs/mixed-login-external-accounts-design.md`

## Visão Geral

Criar o fluxo autenticado de reautenticação recente no provider externo e a rota dedicada para definir a primeira senha local. Esse task precisa manter tudo no mesmo usuário, reutilizar a notificação de senha já existente e expor um contrato que o frontend consiga consumir sem depender de estado implícito. O reflexo imediato da nova capacidade no cliente ficará amarrado à invalidação de `/users/me` no Task 4, porque `hasPassword` não vive no payload do JWT atual.

## Arquivos

- Create: `apps/backend/src/user/application/error/password-already-set-error.ts`
- Create: `apps/backend/src/user/application/error/reauth-grant-invalid-error.ts`
- Create: `apps/backend/src/user/application/error/external-provider-not-linked-error.ts`
- Create: `apps/backend/src/user/application/use-case/create-password-reauth-grant.usecase.ts`
- Create: `apps/backend/src/user/application/use-case/define-password.usecase.ts`
- Create: `apps/backend/src/user/infra/controller/create-password-reauth-grant.controller.ts`
- Create: `apps/backend/src/user/infra/controller/define-password.controller.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`
- Modify: `apps/backend/src/user/infra/controller/routes/user-routes.ts`
- Test: `apps/backend/src/user/application/use-case/create-password-reauth-grant.usecase.test.ts`
- Test: `apps/backend/src/user/application/use-case/define-password.usecase.test.ts`
- Test: `apps/backend/src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts`
- Test: `apps/backend/src/user/infra/controller/define-password.business-flow-test.ts`

## Conformidade com as Competências Padrão

- `test-driven-development`
- `no-workarounds`
- `test-antipatterns`
- `context7`
- `systematic-debugging`

## Passos

- [ ] **Step 1: Write the failing test**

```ts
// apps/backend/src/user/application/use-case/create-password-reauth-grant.usecase.test.ts
test("Deve criar um reauthGrant para conta externa sem senha local", async () => {
	const user = await createAndSaveUser({
		userRepository,
		email: "google-only@doe.com",
		googleId: "google-sub-123",
	})
	googleAuthProvider.addValidToken("reauth-token", {
		sub: "google-sub-123",
		email: user.email,
		name: user.name,
		emailVerified: true,
	})

	const result = await sut.execute({
		userId: user.id,
		provider: "google",
		idToken: "reauth-token",
	})

	expect(result.isSuccess()).toBe(true)
	expect(result.forceSuccess().value).toMatchObject({
		reauthGrant: expect.any(String),
		expiresInSeconds: 300,
	})
})

// apps/backend/src/user/application/use-case/define-password.usecase.test.ts
test("Deve definir a primeira senha e consumir o grant", async () => {
	const user = await createAndSaveUser({
		userRepository,
		email: "google-only@doe.com",
		googleId: "google-sub-123",
	})
	await cacheDB.set("password-reauth:grant-123", {
		userId: user.id,
		provider: "google",
	}, 300)

	const result = await sut.execute({
		userId: user.id,
		provider: "google",
		reauthGrant: "grant-123",
		newRawPassword: "Senha123!",
	})

	expect(result.isSuccess()).toBe(true)
	await expect(user.checkPassword("Senha123!")).resolves.toBe(true)
	await expect(cacheDB.get("password-reauth:grant-123")).resolves.toBeNull()
	expect(queue.queues.has("passwordChanged")).toBe(true)
})

// apps/backend/src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts
test("Deve retornar reauthGrant válido para conta Google sem senha local", async () => {
	const user = await createAndSaveUser({
		userRepository,
		email: "google-only@doe.com",
		googleId: "google-sub-123",
	})
	googleAuthProvider.addValidToken("reauth-token", {
		sub: "google-sub-123",
		email: user.email,
		name: user.name,
		emailVerified: true,
	})
	const token = (
		await authenticateWithGoogle.execute({ idToken: "reauth-token" })
	).force.success().value.token

	const response = await request(fastifyServer.server)
		.post(UserRoutes.PASSWORD_REAUTH)
		.set("Authorization", `Bearer ${token}`)
		.send({ provider: "google", idToken: "reauth-token" })

	expect(response.status).toBe(HTTP_STATUS.OK)
	expect(response.body).toEqual({
		reauthGrant: expect.any(String),
		expiresInSeconds: 300,
	})
})

// apps/backend/src/user/infra/controller/define-password.business-flow-test.ts
test("Deve definir a primeira senha e permitir login por email/senha na mesma conta", async () => {
	const user = await createAndSaveUser({
		userRepository,
		email: "google-only@doe.com",
		googleId: "google-sub-123",
	})
	googleAuthProvider.addValidToken("reauth-token", {
		sub: "google-sub-123",
		email: user.email,
		name: user.name,
		emailVerified: true,
	})
	const googleToken = (
		await authenticateWithGoogle.execute({ idToken: "reauth-token" })
	).force.success().value.token
	const reauthResponse = await request(fastifyServer.server)
		.post(UserRoutes.PASSWORD_REAUTH)
		.set("Authorization", `Bearer ${googleToken}`)
		.send({ provider: "google", idToken: "reauth-token" })

	const defineResponse = await request(fastifyServer.server)
		.post(UserRoutes.PASSWORD)
		.set("Authorization", `Bearer ${googleToken}`)
		.send({
			provider: "google",
			reauthGrant: reauthResponse.body.reauthGrant,
			newRawPassword: "Senha123!",
		})

	const loginResponse = await request(fastifyServer.server)
		.post(SessionRoutes.AUTHENTICATE)
		.send({
			email: user.email,
			password: "Senha123!",
		})

	expect(defineResponse.status).toBe(HTTP_STATUS.NO_CONTENT)
	expect(loginResponse.status).toBe(HTTP_STATUS.OK)
	expect(loginResponse.body).toEqual({
		token: expect.any(String),
		refreshToken: expect.any(String),
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:run -- src/user/application/use-case/create-password-reauth-grant.usecase.test.ts src/user/application/use-case/define-password.usecase.test.ts && pnpm --filter backend test:business-flow -- src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts src/user/infra/controller/define-password.business-flow-test.ts`
Expected: FAIL porque ainda não existem os novos use cases, rotas `POST /users/me/password/reauth` e `POST /users/me/password`, nem o consumo de grants de uso único.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/backend/src/user/infra/controller/routes/user-routes.ts
export const UserRoutes = {
	CREATE: PREFIX,
	FETCH: PREFIX,
	PROFILE: `${PREFIX}/:userId`,
	ME: `${PREFIX}/me`,
	METRICS: `${PREFIX}/me/metrics`,
	CHANGE_PASSWORD: `${PREFIX}/me/change-password`,
	PASSWORD_REAUTH: `${PREFIX}/me/password/reauth`,
	PASSWORD: `${PREFIX}/me/password`,
	ACTIVATE_USER: `${PREFIX}/activate`,
	SUSPEND_USER: `${PREFIX}/suspend`,
} as const

// apps/backend/src/user/application/error/password-already-set-error.ts
export class PasswordAlreadySetError extends Error {
	constructor() {
		super("Password already set for this account")
		this.name = "PasswordAlreadySetError"
	}
}

// apps/backend/src/user/application/error/reauth-grant-invalid-error.ts
export class ReauthGrantInvalidError extends Error {
	constructor() {
		super("Reauth grant is invalid or expired")
		this.name = "ReauthGrantInvalidError"
	}
}

// apps/backend/src/user/application/error/external-provider-not-linked-error.ts
export class ExternalProviderNotLinkedError extends Error {
	constructor() {
		super("External provider not linked to this account")
		this.name = "ExternalProviderNotLinkedError"
	}
}

// apps/backend/src/user/application/use-case/create-password-reauth-grant.usecase.ts
@injectable()
export class CreatePasswordReauthGrantUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User) private readonly userRepository: UserRepository,
		@inject(AUTH_TYPES.Providers.GoogleAuth) private readonly googleAuthProvider: GoogleAuthProvider,
		@inject(SHARED_TYPES.Redis) private readonly cacheDB: CacheDB,
	) {}

	public async execute(input: {
		userId: string
		provider: "google"
		idToken: string
	}): Promise<Either<UserNotFoundError | PasswordAlreadySetError | ExternalProviderNotLinkedError | InvalidGoogleTokenError | GoogleEmailNotVerifiedError, { reauthGrant: string; expiresInSeconds: number }>> {
		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		if (user.password) return failure(new PasswordAlreadySetError())
		if (input.provider === "google" && !user.googleId) {
			return failure(new ExternalProviderNotLinkedError())
		}

		const googleUserInfoResult = await this.googleAuthProvider.verify(input.idToken)
		if (googleUserInfoResult.isFailure()) return failure(googleUserInfoResult.value)
		const googleUserInfo = googleUserInfoResult.value
		if (!googleUserInfo.emailVerified) return failure(new GoogleEmailNotVerifiedError())
		if (googleUserInfo.sub !== user.googleId) {
			return failure(new ExternalProviderNotLinkedError())
		}

		const reauthGrant = randomBytes(16).toString("hex")
		await this.cacheDB.set(`password-reauth:${reauthGrant}`, {
			userId: user.id,
			provider: input.provider,
		}, 300)

		return success({ reauthGrant, expiresInSeconds: 300 })
	}
}

// apps/backend/src/user/application/use-case/define-password.usecase.ts
@injectable()
export class DefinePasswordUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User) private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis) private readonly cacheDB: CacheDB,
		@inject(SHARED_TYPES.Queue) private readonly queue: Queue,
	) {
		this.handlePasswordChangedEvent = this.handlePasswordChangedEvent.bind(this)
	}

	public async execute(input: {
		userId: string
		provider: "google"
		reauthGrant: string
		newRawPassword: string
	}): Promise<Either<UserNotFoundError | PasswordAlreadySetError | ReauthGrantInvalidError | ExternalProviderNotLinkedError | ValidationError, null>> {
		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		if (user.password) return failure(new PasswordAlreadySetError())
		if (input.provider === "google" && !user.googleId) {
			return failure(new ExternalProviderNotLinkedError())
		}

		const cacheKey = `password-reauth:${input.reauthGrant}`
		const grant = await this.cacheDB.get<{ userId: string; provider: "google" }>(cacheKey)
		if (!grant || grant.userId !== user.id || grant.provider !== input.provider) {
			return failure(new ReauthGrantInvalidError())
		}

		user.subscribe(this.handlePasswordChangedEvent)
		const changePasswordResult = await user.changePassword(input.newRawPassword)
		if (changePasswordResult.isFailure()) return failure(changePasswordResult.value)

		await this.userRepository.update(user)
		await this.cacheDB.delete(cacheKey)
		return success(null)
	}

	private handlePasswordChangedEvent(data: PasswordChangedEvent): void {
		const event = new PasswordChangedEvent({
			userEmail: data.payload.userEmail,
			userName: data.payload.userName,
		})
		this.queue.publish(event.eventName, event)
	}
}

// apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts
UseCases: {
	...,
	CreatePasswordReauthGrant: Symbol.for("CreatePasswordReauthGrantUseCase"),
	DefinePassword: Symbol.for("DefinePasswordUseCase"),
},
Controllers: {
	...,
	CreatePasswordReauthGrant: Symbol.for("CreatePasswordReauthGrantController"),
	DefinePassword: Symbol.for("DefinePasswordController"),
},

// apps/backend/src/shared/infra/ioc/module/user/user-module.ts
bind(USER_TYPES.UseCases.CreatePasswordReauthGrant).to(CreatePasswordReauthGrantUseCase)
bind(USER_TYPES.UseCases.DefinePassword).to(DefinePasswordUseCase)
bind(USER_TYPES.Controllers.CreatePasswordReauthGrant).to(CreatePasswordReauthGrantController)
bind(USER_TYPES.Controllers.DefinePassword).to(DefinePasswordController)

// apps/backend/src/bootstrap/setup-user-module.ts
resolve(USER_TYPES.Controllers.CreatePasswordReauthGrant),
resolve(USER_TYPES.Controllers.DefinePassword),

// apps/backend/src/user/infra/controller/create-password-reauth-grant.controller.ts
const bodySchema = z.object({
	provider: z.literal("google"),
	idToken: z.string().min(1),
})

// apps/backend/src/user/infra/controller/define-password.controller.ts
const bodySchema = z.object({
	provider: z.literal("google"),
	reauthGrant: z.string().min(1),
	newRawPassword: z.string().min(8).max(128),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run -- src/user/application/use-case/create-password-reauth-grant.usecase.test.ts src/user/application/use-case/define-password.usecase.test.ts && pnpm --filter backend test:business-flow -- src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts src/user/infra/controller/define-password.business-flow-test.ts`
Expected: PASS, com `reauthGrant` de uso único válido por 5 minutos, a primeira senha persistida no mesmo usuário e o evento `passwordChanged` disparado para notificação.

- [ ] **Step 5: Ask for commit approval and commit**

```bash
git add \
  apps/backend/src/user/application/error/password-already-set-error.ts \
  apps/backend/src/user/application/error/reauth-grant-invalid-error.ts \
  apps/backend/src/user/application/error/external-provider-not-linked-error.ts \
  apps/backend/src/user/application/use-case/create-password-reauth-grant.usecase.ts \
  apps/backend/src/user/application/use-case/define-password.usecase.ts \
  apps/backend/src/user/infra/controller/create-password-reauth-grant.controller.ts \
  apps/backend/src/user/infra/controller/define-password.controller.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts \
  apps/backend/src/shared/infra/ioc/module/user/user-module.ts \
  apps/backend/src/bootstrap/setup-user-module.ts \
  apps/backend/src/user/infra/controller/routes/user-routes.ts \
  apps/backend/src/user/application/use-case/create-password-reauth-grant.usecase.test.ts \
  apps/backend/src/user/application/use-case/define-password.usecase.test.ts \
  apps/backend/src/user/infra/controller/create-password-reauth-grant.business-flow-test.ts \
  apps/backend/src/user/infra/controller/define-password.business-flow-test.ts

# Somente depois da permissão explícita do usuário:
git commit -m "feat: add first-password flow for external accounts"
```

## Critérios de Sucesso

- Existe um fluxo autenticado de reautenticação recente (`POST /users/me/password/reauth`) e um fluxo separado para a primeira senha (`POST /users/me/password`).
- O grant é de uso único, expira, e não permite trocar de usuário nem de provider.
- A definição da primeira senha habilita imediatamente o login por email/senha para a mesma conta e preserva a notificação de senha alterada.
