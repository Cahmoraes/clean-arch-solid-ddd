import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db.js"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { QueueMemoryAdapter } from "@/shared/infra/queue/queue-memory-adapter"
import { PasswordAlreadySetError } from "../error/password-already-set-error"
import { ReauthGrantInvalidError } from "../error/reauth-grant-invalid-error"
import type {
	DefinePasswordUseCase,
	DefinePasswordUseCaseInput,
} from "./define-password.usecase"

describe("DefinePasswordUseCase", () => {
	let sut: DefinePasswordUseCase
	let userRepository: InMemoryUserRepository
	let cacheDB: CacheDB
	let queue: QueueMemoryAdapter

	beforeEach(() => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		cacheDB = container.get(SHARED_TYPES.Redis)
		queue = new QueueMemoryAdapter()
		container.unbind(SHARED_TYPES.Queue)
		container.bind(SHARED_TYPES.Queue).toConstantValue(queue)
		sut = container.get<DefinePasswordUseCase>(
			USER_TYPES.UseCases.DefinePassword,
		)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve definir a primeira senha e consumir o grant", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google-only@doe.com",
			googleId: "google-sub-123",
		})
		await cacheDB.set(
			"password-reauth:grant-123",
			{
				userId: user.id,
				provider: "google",
			},
			300,
		)

		const input: DefinePasswordUseCaseInput = {
			userId: user.id,
			provider: "google",
			reauthGrant: "grant-123",
			newRawPassword: "Senha123!",
		}

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		await expect(user.checkPassword("Senha123!")).resolves.toBe(true)
		await expect(cacheDB.get("password-reauth:grant-123")).resolves.toBeNull()
		expect(queue.queues.has("passwordChanged")).toBe(true)
	})

	test("Deve retornar PasswordAlreadySetError para conta que já tem senha", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@doe.com",
			password: "Senha123!",
			googleId: "google-sub-123",
		})
		await cacheDB.set(
			"password-reauth:grant-456",
			{ userId: user.id, provider: "google" },
			300,
		)

		const result = await sut.execute({
			userId: user.id,
			provider: "google",
			reauthGrant: "grant-456",
			newRawPassword: "NovaSenha123!",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(PasswordAlreadySetError)
	})

	test("Deve retornar ReauthGrantInvalidError para grant inexistente", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google-only@doe.com",
			googleId: "google-sub-123",
		})

		const result = await sut.execute({
			userId: user.id,
			provider: "google",
			reauthGrant: "grant-invalido",
			newRawPassword: "Senha123!",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(ReauthGrantInvalidError)
	})

	test("Deve remover o grant do cache após o primeiro uso para impedir reutilização", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google-only-reuse@doe.com",
			googleId: "google-sub-reuse",
		})
		await cacheDB.set(
			"password-reauth:grant-reuse",
			{ userId: user.id, provider: "google" },
			300,
		)

		const firstResult = await sut.execute({
			userId: user.id,
			provider: "google",
			reauthGrant: "grant-reuse",
			newRawPassword: "Senha123!",
		})

		expect(firstResult.isSuccess()).toBe(true)
		await expect(cacheDB.get("password-reauth:grant-reuse")).resolves.toBeNull()
	})
})
