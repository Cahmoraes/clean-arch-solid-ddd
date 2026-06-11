# Task 6: AuthenticateWithGoogleUseCase [RF-001, RF-002, RF-007, RF-008, RF-009, RF-010]

**Status:** PENDING
**PRD:** `../prd/prd-google-social-login.md`
**Spec:** `../specs/google-social-login-design.md`

## Visão Geral

Criar o Use Case principal que valida o ID Token do Google, resolve o usuário (busca por google_id, vincula por email, ou cria novo), e emite os JWTs da aplicação. Implementar com TDD.

## Arquivos

- Create: `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts`
- Create: `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.test.ts`

## Passos

- [ ] **Step 1: Escrever todos os testes**

Criar `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.test.ts`:

```typescript
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { AuthToken } from "@/user/application/auth/auth-token"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { User } from "@/user/domain/user"
import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import { GoogleEmailNotVerifiedError } from "@/session/application/error/google-email-not-verified-error.js"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import type { AuthenticateWithGoogleUseCase } from "./authenticate-with-google.usecase.js"

const VALID_TOKEN = "valid-google-id-token"
const GOOGLE_USER = {
	sub: "google-sub-123",
	email: "google@example.com",
	name: "Google User",
	emailVerified: true,
}

describe("AuthenticateWithGoogleUseCase", () => {
	let sut: AuthenticateWithGoogleUseCase
	let userRepository: UserRepository
	let authToken: AuthToken
	let googleAuthProvider: InMemoryGoogleAuthProvider

	beforeEach(() => {
		container.snapshot()
		const repos = setupInMemoryRepositories()
		userRepository = repos.userRepository
		googleAuthProvider = new InMemoryGoogleAuthProvider()
		container
			.rebind(AUTH_TYPES.Providers.GoogleAuth)
			.toConstantValue(googleAuthProvider)
		sut = container.get(AUTH_TYPES.UseCases.AuthenticateWithGoogle)
		authToken = container.get(SHARED_TYPES.Tokens.Auth)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve criar um novo usuário quando google_id e email não existem", async () => {
		googleAuthProvider.addValidToken(VALID_TOKEN, GOOGLE_USER)

		const result = await sut.execute({ idToken: VALID_TOKEN })

		expect(result.isSuccess()).toBe(true)
		const { token, refreshToken } = result.force.success().value
		expect(token).toEqual(expect.any(String))
		expect(refreshToken).toEqual(expect.any(String))

		const user = await userRepository.userOfGoogleId(GOOGLE_USER.sub)
		expect(user).not.toBeNull()
		expect(user!.email).toBe(GOOGLE_USER.email)
		expect(user!.name).toBe(GOOGLE_USER.name)
		expect(user!.googleId).toBe(GOOGLE_USER.sub)
		expect(user!.password).toBeUndefined()
	})

	test("Deve fazer login em usuário existente por google_id", async () => {
		googleAuthProvider.addValidToken(VALID_TOKEN, GOOGLE_USER)

		const existingUser = (
			await User.create({
				name: GOOGLE_USER.name,
				email: GOOGLE_USER.email,
				googleId: GOOGLE_USER.sub,
			})
		).force.success().value
		await userRepository.save(existingUser)

		const result = await sut.execute({ idToken: VALID_TOKEN })

		expect(result.isSuccess()).toBe(true)
		const { token } = result.force.success().value
		const decoded = authToken.verify<{ sub: { email: string } }>(
			token,
			env.PRIVATE_KEY,
		)
		expect(decoded.force.success().value.sub.email).toBe(GOOGLE_USER.email)
	})

	test("Deve vincular google_id a conta existente por email verificado", async () => {
		googleAuthProvider.addValidToken(VALID_TOKEN, GOOGLE_USER)

		const existingUser = (
			await User.create({
				name: "Existing User",
				email: GOOGLE_USER.email,
				password: "any_password",
			})
		).force.success().value
		await userRepository.save(existingUser)

		const result = await sut.execute({ idToken: VALID_TOKEN })

		expect(result.isSuccess()).toBe(true)
		const updatedUser = await userRepository.userOfEmail(GOOGLE_USER.email)
		expect(updatedUser!.googleId).toBe(GOOGLE_USER.sub)
	})

	test("Deve rejeitar quando email_verified é false", async () => {
		googleAuthProvider.addValidToken(VALID_TOKEN, {
			...GOOGLE_USER,
			emailVerified: false,
		})

		const result = await sut.execute({ idToken: VALID_TOKEN })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(
			GoogleEmailNotVerifiedError,
		)
	})

	test("Deve rejeitar quando token Google é inválido", async () => {
		const result = await sut.execute({ idToken: "invalid-token" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
	})

	test("Deve rejeitar quando usuário está suspenso", async () => {
		googleAuthProvider.addValidToken(VALID_TOKEN, GOOGLE_USER)

		const existingUser = (
			await User.create({
				name: GOOGLE_USER.name,
				email: GOOGLE_USER.email,
				googleId: GOOGLE_USER.sub,
			})
		).force.success().value
		existingUser.suspend()
		await userRepository.save(existingUser)

		const result = await sut.execute({ idToken: VALID_TOKEN })

		expect(result.isFailure()).toBe(true)
	})
})
```

- [ ] **Step 2: Rodar testes para verificar que falham**

```bash
pnpm --filter backend test:run -- -t "AuthenticateWithGoogleUseCase"
```

Esperado: FAIL — módulo `authenticate-with-google.usecase.js` não encontrado.

- [ ] **Step 3: Implementar o Use Case**

Criar `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts`:

```typescript
import { randomBytes } from "node:crypto"

import { inject, injectable } from "inversify"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { env } from "@/shared/infra/env/index.js"
import { AUTH_TYPES, SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types.js"
import type { AuthToken } from "@/user/application/auth/auth-token.js"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository.js"
import { User } from "@/user/domain/user.js"
import { GoogleId } from "@/user/domain/value-object/google-id.js"
import { InvalidCredentialsError } from "@/user/application/error/invalid-credentials-error.js"
import { GoogleEmailNotVerifiedError } from "../error/google-email-not-verified-error.js"
import { InvalidGoogleTokenError } from "../error/invalid-google-token-error.js"
import type { GoogleAuthProvider } from "../provider/google-auth-provider.js"

export interface AuthenticateWithGoogleInput {
	idToken: string
}

export interface AuthenticateWithGoogleOutput {
	token: string
	refreshToken: string
}

type AuthenticateWithGoogleErrors =
	| InvalidGoogleTokenError
	| GoogleEmailNotVerifiedError
	| InvalidCredentialsError

@injectable()
export class AuthenticateWithGoogleUseCase {
	constructor(
		@inject(AUTH_TYPES.Providers.GoogleAuth)
		private readonly googleAuthProvider: GoogleAuthProvider,
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
	) {}

	public async execute(
		input: AuthenticateWithGoogleInput,
	): Promise<Either<AuthenticateWithGoogleErrors, AuthenticateWithGoogleOutput>> {
		const verifyResult = await this.googleAuthProvider.verify(input.idToken)
		if (verifyResult.isFailure()) {
			return failure(verifyResult.value)
		}

		const googleUserInfo = verifyResult.value

		if (!googleUserInfo.emailVerified) {
			return failure(new GoogleEmailNotVerifiedError())
		}

		const user = await this.resolveUser(googleUserInfo)
		if (!user) {
			return failure(new InvalidGoogleTokenError())
		}

		if (user.isSuspend) {
			return failure(new InvalidCredentialsError())
		}

		const jwi = this.createJSONWebId()
		return success({
			token: this.signUserToken(user, jwi),
			refreshToken: this.createRefreshToken(user, jwi),
		})
	}

	private async resolveUser(googleUserInfo: {
		sub: string
		email: string
		name: string
	}): Promise<User | null> {
		const userByGoogleId = await this.userRepository.userOfGoogleId(
			googleUserInfo.sub,
		)
		if (userByGoogleId) {
			return userByGoogleId
		}

		const userByEmail = await this.userRepository.userOfEmail(
			googleUserInfo.email,
		)
		if (userByEmail) {
			userByEmail.linkGoogleAccount(GoogleId.restore(googleUserInfo.sub))
			await this.userRepository.update(userByEmail)
			return userByEmail
		}

		return this.createGoogleUser(googleUserInfo)
	}

	private async createGoogleUser(googleUserInfo: {
		sub: string
		email: string
		name: string
	}): Promise<User | null> {
		const userResult = await User.create({
			name: googleUserInfo.name,
			email: googleUserInfo.email,
			googleId: googleUserInfo.sub,
		})
		if (userResult.isFailure()) {
			return null
		}
		const user = userResult.value
		await this.userRepository.save(user)
		return user
	}

	private createJSONWebId(): string {
		return randomBytes(16).toString("hex")
	}

	private signUserToken(user: User, jwi: string): string {
		return this.authToken.sign(
			{
				sub: {
					id: user.id,
					email: user.email,
					role: user.role,
					jwi,
				},
			},
			env.PRIVATE_KEY,
		)
	}

	private createRefreshToken(user: User, jwi: string): string {
		return this.authToken.refreshToken(
			{
				sub: {
					id: user.id,
					email: user.email,
					role: user.role,
					jwi,
				},
			},
			env.PRIVATE_KEY,
		)
	}
}
```

- [ ] **Step 4: Rodar testes para verificar que passam**

```bash
pnpm --filter backend test:run -- -t "AuthenticateWithGoogleUseCase"
```

Esperado: TODOS os 6 testes passam.

Nota: os testes referenciam `AUTH_TYPES.Providers.GoogleAuth` e `AUTH_TYPES.UseCases.AuthenticateWithGoogle` que serão registrados na Task 7. Se os testes falharem por falta de binding, adicione os símbolos temporariamente ao `auth-types.ts` e registre os bindings no `session-module.ts` antecipadamente.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/session/application/use-case/authenticate-with-google*
git commit -m "feat(backend): add AuthenticateWithGoogleUseCase with tests"
```

## Critérios de Sucesso

- Novo usuário criado quando google_id e email não existem (RF-009)
- Login direto por google_id existente (RF-007)
- Vinculação automática de google_id por email verificado (RF-008)
- Rejeição quando email_verified é false (RF-010)
- Rejeição quando token é inválido (RF-003)
- Rejeição quando usuário está suspenso
- Emite JWT e Refresh Token no formato existente (RF-002)
