import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { GoogleEmailNotVerifiedError } from "@/session/application/error/google-email-not-verified-error.js"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db.js"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { StatusTypes } from "@/user/domain/value-object/status"
import { ExternalProviderNotLinkedError } from "../error/external-provider-not-linked-error"
import { PasswordAlreadySetError } from "../error/password-already-set-error"
import type {
	CreatePasswordReauthGrantUseCase,
	CreatePasswordReauthGrantUseCaseInput,
} from "./create-password-reauth-grant.usecase"

describe("CreatePasswordReauthGrantUseCase", () => {
	let sut: CreatePasswordReauthGrantUseCase
	let userRepository: InMemoryUserRepository
	let cacheDB: CacheDB
	let googleAuthProvider: InMemoryGoogleAuthProvider

	beforeEach(() => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		cacheDB = container.get(SHARED_TYPES.Redis)
		googleAuthProvider = new InMemoryGoogleAuthProvider()
		container
			.rebind(AUTH_TYPES.Providers.GoogleAuth)
			.toConstantValue(googleAuthProvider)
		sut = container.get<CreatePasswordReauthGrantUseCase>(
			USER_TYPES.UseCases.CreatePasswordReauthGrant,
		)
	})

	afterEach(() => {
		container.restore()
	})

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

		const input: CreatePasswordReauthGrantUseCaseInput = {
			userId: user.id,
			provider: "google",
			idToken: "reauth-token",
		}

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({
			reauthGrant: expect.any(String),
			expiresInSeconds: 300,
		})

		const cachedGrant = await cacheDB.get<{
			userId: string
			provider: string
		}>(`password-reauth:${result.forceSuccess().value.reauthGrant}`)
		expect(cachedGrant).toEqual({
			userId: user.id,
			provider: "google",
		})
	})

	test("Deve retornar PasswordAlreadySetError para conta que já tem senha", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@doe.com",
			password: "Senha123!",
			googleId: "google-sub-123",
		})

		const result = await sut.execute({
			userId: user.id,
			provider: "google",
			idToken: "any-token",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(PasswordAlreadySetError)
	})

	test("Deve retornar ExternalProviderNotLinkedError para conta sem googleId", async () => {
		const user = User.restore({
			id: "user-without-provider",
			name: "any_name",
			email: "user@doe.com",
			role: "MEMBER",
			status: StatusTypes.ACTIVATED,
			createdAt: new Date(),
		})
		await userRepository.save(user)

		const result = await sut.execute({
			userId: user.id,
			provider: "google",
			idToken: "any-token",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(
			ExternalProviderNotLinkedError,
		)
	})

	test("Deve retornar ExternalProviderNotLinkedError quando sub do token não corresponde ao googleId do usuário", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google-only@doe.com",
			googleId: "google-sub-real",
		})
		googleAuthProvider.addValidToken("bad-token", {
			sub: "google-sub-diferente",
			email: user.email,
			name: user.name,
			emailVerified: true,
		})

		const result = await sut.execute({
			userId: user.id,
			provider: "google",
			idToken: "bad-token",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(
			ExternalProviderNotLinkedError,
		)
	})

	test("Deve retornar GoogleEmailNotVerifiedError quando o email Google não for verificado", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google-unverified@doe.com",
			googleId: "google-sub-123",
		})
		googleAuthProvider.addValidToken("unverified-token", {
			sub: "google-sub-123",
			email: user.email,
			name: user.name,
			emailVerified: false,
		})

		const result = await sut.execute({
			userId: user.id,
			provider: "google",
			idToken: "unverified-token",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(
			GoogleEmailNotVerifiedError,
		)
	})
})
