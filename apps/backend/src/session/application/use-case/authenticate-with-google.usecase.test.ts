import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { GoogleAccountAlreadyLinkedError } from "@/session/application/error/google-account-already-linked-error.js"
import { GoogleEmailNotVerifiedError } from "@/session/application/error/google-email-not-verified-error.js"
import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { AuthToken } from "@/user/application/auth/auth-token"

import type { AuthenticateWithGoogleUseCase } from "./authenticate-with-google.usecase.js"
import { AuthenticateWithGoogleUseCase as AuthenticateWithGoogleUseCaseClass } from "./authenticate-with-google.usecase.js"

interface JWTResponse {
	sub: {
		id: string
		email: string
		role: string
		jwi: string
	}
}

describe("AuthenticateWithGoogleUseCase", () => {
	let sut: AuthenticateWithGoogleUseCase
	let userRepository: InMemoryUserRepository
	let googleAuthProvider: InMemoryGoogleAuthProvider
	let authToken: AuthToken

	beforeEach(async () => {
		container.snapshot()
		container
			.rebind(AUTH_TYPES.UseCases.AuthenticateWithGoogle)
			.to(AuthenticateWithGoogleUseCaseClass)
		googleAuthProvider = new InMemoryGoogleAuthProvider()
		container
			.rebind(AUTH_TYPES.Providers.GoogleAuth)
			.toConstantValue(googleAuthProvider)
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		sut = container.get(AUTH_TYPES.UseCases.AuthenticateWithGoogle)
		authToken = container.get(SHARED_TYPES.Tokens.Auth)
	})

	afterEach(() => {
		container.restore()
	})

	test("deve retornar InvalidGoogleTokenError quando o token for inválido", async () => {
		const result = await sut.execute({ idToken: "invalid" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
	})

	test("deve retornar GoogleEmailNotVerifiedError quando o email não for verificado", async () => {
		googleAuthProvider.addValidToken("unverified-token", {
			sub: "google-sub-123",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: false,
		})

		const result = await sut.execute({ idToken: "unverified-token" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(
			GoogleEmailNotVerifiedError,
		)
	})

	test("deve autenticar usuário existente com googleId", async () => {
		await createAndSaveUser({
			userRepository,
			googleId: "google-sub-123",
			email: "john@doe.com",
		})
		googleAuthProvider.addValidToken("valid-token", {
			sub: "google-sub-123",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})

		const result = await sut.execute({ idToken: "valid-token" })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual({
			token: expect.any(String),
			refreshToken: expect.any(String),
		})
	})

	test("deve vincular conta Google a usuário existente pelo email e autenticar", async () => {
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
		const linkedUser = await userRepository.userOfGoogleId("google-sub-123")

		expect(result.isSuccess()).toBe(true)
		expect(linkedUser).not.toBeNull()
		expect(linkedUser?.email).toBe("john@doe.com")
	})

	test("deve criar novo usuário via Google e autenticar", async () => {
		googleAuthProvider.addValidToken("new-user-token", {
			sub: "google-sub-123",
			email: "new@user.com",
			name: "New User",
			emailVerified: true,
		})

		const result = await sut.execute({ idToken: "new-user-token" })
		const createdUser = await userRepository.userOfEmail("new@user.com")

		expect(result.isSuccess()).toBe(true)
		expect(createdUser).not.toBeNull()
		expect(createdUser?.name).toBe("New User")
		expect(createdUser?.googleId).toBe("google-sub-123")
	})

	test("deve retornar GoogleAccountAlreadyLinkedError quando email já vinculado a outro googleId", async () => {
		await createAndSaveUser({
			userRepository,
			email: "john@doe.com",
			googleId: "existing-google-sub",
		})
		googleAuthProvider.addValidToken("conflict-token", {
			sub: "different-google-sub",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})

		const result = await sut.execute({ idToken: "conflict-token" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(
			GoogleAccountAlreadyLinkedError,
		)
	})

	test("deve autenticar usuário existente quando save falha por race condition (upsert otimista)", async () => {
		googleAuthProvider.addValidToken("race-token", {
			sub: "google-sub-race",
			email: "race@user.com",
			name: "Race User",
			emailVerified: true,
		})
		// Simula race condition: save lança exceção mas o usuário já existe
		const existingUser = await createAndSaveUser({
			userRepository,
			email: "race@user.com",
			googleId: "google-sub-race",
		})
		vi.spyOn(userRepository, "save").mockRejectedValueOnce(
			new Error("Unique constraint violation"),
		)

		const result = await sut.execute({ idToken: "race-token" })

		expect(result.isSuccess()).toBe(true)
		const { token } = result.forceSuccess().value
		expect(token).toEqual(expect.any(String))
		vi.restoreAllMocks()
		const savedUser = await userRepository.userOfGoogleId("google-sub-race")
		expect(savedUser?.id).toBe(existingUser.id)
	})

	test("deve retornar tokens válidos com dados do usuário corretos", async () => {
		const user = await createAndSaveUser({
			userRepository,
			googleId: "google-sub-123",
			email: "admin@doe.com",
			role: "ADMIN",
		})
		googleAuthProvider.addValidToken("jwt-token", {
			sub: "google-sub-123",
			email: "admin@doe.com",
			name: user.name,
			emailVerified: true,
		})

		const result = await sut.execute({ idToken: "jwt-token" })
		const { token, refreshToken } = result.forceSuccess().value
		const decoded = authToken
			.verify<JWTResponse>(token, env.PRIVATE_KEY)
			.force.success().value
		const decodedRefreshToken = authToken
			.verify<JWTResponse>(refreshToken, env.PRIVATE_KEY)
			.force.success().value

		expect(decoded.sub).toEqual({
			id: user.id,
			email: user.email,
			role: user.role,
			jwi: expect.any(String),
		})
		expect(decodedRefreshToken.sub).toEqual(decoded.sub)
	})
})
