# Task 1: Endurecer fluxos atuais de senha e login local [RF-008, RF-009, RF-010]

**Status:** PENDING
**PRD:** `../prd/prd-mixed-login-external-accounts.md`
**Spec:** `../specs/mixed-login-external-accounts-design.md`

## Visão Geral

Corrigir primeiro o fluxo local que já existe: `change-password` precisa exigir a senha atual e persistir a mudança, e o login por email/senha precisa diferenciar o caso “usuário existe, mas ainda não possui senha local”. Sem isso, o login misto nasce em cima de um fluxo inconsistente.

## Arquivos

- Create: `apps/backend/src/user/application/error/password-not-set-error.ts`
- Modify: `apps/backend/src/user/application/use-case/change-password.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/change-password.controller.ts`
- Modify: `apps/backend/src/session/application/use-case/authenticate.usecase.ts`
- Modify: `apps/backend/src/session/infra/controller/authenticate.controller.ts`
- Modify/Test: `apps/backend/src/user/application/use-case/change-password.usecase.test.ts`
- Modify/Test: `apps/backend/src/user/infra/controller/change-password.business-flow-test.ts`
- Modify/Test: `apps/backend/src/session/application/use-case/authenticate.usecase.test.ts`
- Modify/Test: `apps/backend/src/session/infra/controller/authenticate.business-flow-test.ts`

## Conformidade com as Competências Padrão

- `systematic-debugging`
- `no-workarounds`
- `test-driven-development`
- `test-antipatterns`

## Passos

- [ ] **Step 1: Write the failing test**

```ts
// Append the snippets below to the existing test files. Do not remove the
// current coverage for success, validation, and invalid-user scenarios.

// apps/backend/src/user/application/use-case/change-password.usecase.test.ts
import { vi } from "vitest"
import { InvalidCredentialsError } from "../error/invalid-credentials-error"

test("Deve exigir a senha atual correta antes de alterar o password", async () => {
	const user = await createAndSaveUser({
		userRepository,
		email: "john@mail.com",
		password: "12345678",
	})

	const result = await sut.execute({
		userId: user.id,
		currentRawPassword: "senha_errada",
		newRawPassword: "87654321",
	})

	expect(result.isFailure()).toBe(true)
	expect(result.value).toBeInstanceOf(InvalidCredentialsError)
})

test("Deve persistir a senha alterada chamando update no repositório", async () => {
	const user = await createAndSaveUser({
		userRepository,
		email: "persist@mail.com",
		password: "12345678",
	})
	const updateSpy = vi.spyOn(userRepository, "update")

	const result = await sut.execute({
		userId: user.id,
		currentRawPassword: "12345678",
		newRawPassword: "87654321",
	})

	expect(result.isSuccess()).toBe(true)
	expect(updateSpy).toHaveBeenCalledWith(
		expect.objectContaining({ id: user.id }),
	)
})

// apps/backend/src/user/infra/controller/change-password.business-flow-test.ts
test("Deve retornar 401 quando a senha atual estiver incorreta", async () => {
	const oldPassword = "old_password"
	const user = await createAndSaveUser({
		userRepository,
		name: "any_name",
		email: "any@email.com",
		password: oldPassword,
	})
	const token = (
		await authenticate.execute({
			email: user.email,
			password: oldPassword,
		})
	).force.success().value.token

	const response = await request(fastifyServer.server)
		.patch(UserRoutes.CHANGE_PASSWORD)
		.set("Authorization", `Bearer ${token}`)
		.send({
			currentRawPassword: "wrong_password",
			newRawPassword: "new_password",
		})

	expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	expect(response.body).toEqual({
		code: "current_password_invalid",
		message: "Current password is invalid",
	})
})

// apps/backend/src/session/application/use-case/authenticate.usecase.test.ts
import { PasswordNotSetError } from "@/user/application/error/password-not-set-error"

test("Não deve autenticar por email/senha quando o usuário ainda não possui senha local", async () => {
	await createAndSaveUser({
		name: "John Doe",
		email: "john@doe.com",
		googleId: "google-sub-123",
	})

	const result = await sut.execute({
		email: "john@doe.com",
		password: "qualquer_senha",
	})

	expect(result.isFailure()).toBe(true)
	expect(result.forceFailure().value).toBeInstanceOf(PasswordNotSetError)
})

// apps/backend/src/session/infra/controller/authenticate.business-flow-test.ts
test("Deve retornar 401 com code password_not_set quando a conta existir sem senha local", async () => {
	await createAndSaveUser({
		userRepository,
		email: "google-only@email.com",
		googleId: "google-sub-123",
		name: "Google Only",
	})

	const response = await request(fastifyServer.server)
		.post(SessionRoutes.AUTHENTICATE)
		.send({
			email: "google-only@email.com",
			password: "Senha123!",
		})

	expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	expect(response.body).toEqual({
		code: "password_not_set",
		message: "Password not set for this account",
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:run -- src/user/application/use-case/change-password.usecase.test.ts src/session/application/use-case/authenticate.usecase.test.ts && pnpm --filter backend test:business-flow -- src/user/infra/controller/change-password.business-flow-test.ts src/session/infra/controller/authenticate.business-flow-test.ts`
Expected: FAIL because `ChangePasswordUseCaseInput` ainda não aceita `currentRawPassword`, `ChangePasswordUseCase` não chama `userRepository.update(...)`, e `AuthenticateUseCase` ainda responde `InvalidCredentialsError` genérico quando `password` é `undefined`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/backend/src/user/application/error/password-not-set-error.ts
export class PasswordNotSetError extends Error {
	constructor() {
		super("Password not set for this account")
		this.name = "PasswordNotSetError"
	}
}

// apps/backend/src/user/application/use-case/change-password.usecase.ts
import { InvalidCredentialsError } from "../error/invalid-credentials-error"

export interface ChangePasswordUseCaseInput {
	userId: string
	currentRawPassword: string
	newRawPassword: string
}

export type ChangePasswordUseCaseOutput = Either<
	UserNotFoundError | InvalidCredentialsError | ValidationError | PasswordUnchangedError,
	null
>

public async execute(input: ChangePasswordUseCaseInput): Promise<ChangePasswordUseCaseOutput> {
	const userFound = await this.userRepository.userOfId(input.userId)
	if (!userFound) return failure(new UserNotFoundError())
	if (!(await userFound.checkPassword(input.currentRawPassword))) {
		return failure(new InvalidCredentialsError())
	}
	if (await this.isPasswordUnchanged(userFound, input.newRawPassword)) {
		return failure(new PasswordUnchangedError())
	}
	userFound.subscribe(this.handlePasswordChangedEvent)
	const result = await userFound.changePassword(input.newRawPassword)
	if (result.isFailure()) return failure(result.value)
	await this.userRepository.update(userFound)
	return success(null)
}

// apps/backend/src/user/infra/controller/change-password.controller.ts
const changePasswordSchema = z.object({
	currentRawPassword: z.string().min(1).meta({
		description: "Current password",
		example: "oldpass123",
	}),
	newRawPassword: z.string().min(8).max(128).meta({
		description: "New password (min 8 characters)",
		example: "newpass123",
	}),
})

protected override mapResponseError(error: Error | Error[]): HandleCallbackResponse | undefined {
	if (Array.isArray(error) || error instanceof ZodError) return undefined
	if (error.name === "InvalidCredentialsError") {
		return ResponseFactory.UNAUTHORIZED({
			code: "current_password_invalid",
			message: "Current password is invalid",
		})
	}
	return ResponseFactory.CONFLICT({ message: error.message })
}

const result = await this.changePassword.execute({
	userId: this.extractUserId(req),
	currentRawPassword: parsedBodyOrError.value.currentRawPassword,
	newRawPassword: parsedBodyOrError.value.newRawPassword,
})

// apps/backend/src/session/application/use-case/authenticate.usecase.ts
import { PasswordNotSetError } from "@/user/application/error/password-not-set-error"

export type AuthenticateUseCaseOutput = Either<
	InvalidCredentialsError | PasswordNotSetError,
	AuthTokenOutputDTO
>

if (!userOrNull.password) {
	return failure(new PasswordNotSetError())
}

// apps/backend/src/session/infra/controller/authenticate.controller.ts
if (error.name === "PasswordNotSetError") {
	return ResponseFactory.UNAUTHORIZED({
		code: "password_not_set",
		message: "Password not set for this account",
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run -- src/user/application/use-case/change-password.usecase.test.ts src/session/application/use-case/authenticate.usecase.test.ts && pnpm --filter backend test:business-flow -- src/user/infra/controller/change-password.business-flow-test.ts src/session/infra/controller/authenticate.business-flow-test.ts`
Expected: PASS, com `change-password` exigindo a senha atual, persistindo a alteração no repositório e o login local retornando `code: "password_not_set"` para contas sem senha local.

- [ ] **Step 5: Ask for commit approval and commit**

```bash
git add \
  apps/backend/src/user/application/error/password-not-set-error.ts \
  apps/backend/src/user/application/use-case/change-password.usecase.ts \
  apps/backend/src/user/infra/controller/change-password.controller.ts \
  apps/backend/src/session/application/use-case/authenticate.usecase.ts \
  apps/backend/src/session/infra/controller/authenticate.controller.ts \
  apps/backend/src/user/application/use-case/change-password.usecase.test.ts \
  apps/backend/src/user/infra/controller/change-password.business-flow-test.ts \
  apps/backend/src/session/application/use-case/authenticate.usecase.test.ts \
  apps/backend/src/session/infra/controller/authenticate.business-flow-test.ts

# Somente depois da permissão explícita do usuário:
git commit -m "fix: harden local password flows"
```

## Critérios de Sucesso

- `change-password` exige `currentRawPassword`, persiste a nova senha e segue notificando `passwordChanged`.
- O login por email/senha responde com `code: "password_not_set"` quando a conta existe, mas ainda não tem senha local.
- Todos os testes de unidade e business-flow listados neste task passam junto com `biome:fix` e `tsc:check`.
