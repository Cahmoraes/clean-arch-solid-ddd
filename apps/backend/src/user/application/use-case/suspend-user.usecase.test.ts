import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { UserNotFoundError } from "../error/user-not-found-error"
import type {
	SuspendUserUseCase,
	SuspendUserUseCaseInput,
} from "./suspend-user.usecase"

describe("SuspendUserUseCase", () => {
	let sut: SuspendUserUseCase
	let userRepository: InMemoryUserRepository
	let cacheDB: CacheDB

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		cacheDB = container.get(SHARED_TYPES.Redis)
		sut = container.get(USER_TYPES.UseCases.SuspendUser)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve suspender um usuário", async () => {
		const input: SuspendUserUseCaseInput = {
			userId: "any_user_id",
		}
		const user = (
			await User.create({
				email: "user@email.com",
				name: "any_name",
				password: "any_password",
				id: input.userId,
			})
		).forceSuccess().value
		await userRepository.save(user)
		await sut.execute(input)
		const userFound = await userRepository.userOfId(input.userId)
		expect(userFound?.isActive).toBe(false)
	})

	test("Não deve suspender um usuário inexistente", async () => {
		const input: SuspendUserUseCaseInput = {
			userId: "any_user_id",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("Deve invalidar o cache fetch-users após suspender um usuário", async () => {
		const input: SuspendUserUseCaseInput = {
			userId: "any_user_id",
		}
		const user = (
			await User.create({
				email: "user@email.com",
				name: "any_name",
				password: "any_password",
				id: input.userId,
			})
		).forceSuccess().value
		await userRepository.save(user)
		await cacheDB.set("fetch-users:1:10", { data: [] }, 60)
		await cacheDB.set("fetch-users:2:10", { data: [] }, 60)
		await sut.execute(input)
		const page1 = await cacheDB.get("fetch-users:1:10")
		const page2 = await cacheDB.get("fetch-users:2:10")
		expect(page1).toBeNull()
		expect(page2).toBeNull()
	})

	test("Deve invalidar o cache user-stats após suspender um usuário", async () => {
		const input: SuspendUserUseCaseInput = {
			userId: "any_user_id",
		}
		const user = (
			await User.create({
				email: "user@email.com",
				name: "any_name",
				password: "any_password",
				id: input.userId,
			})
		).forceSuccess().value
		await userRepository.save(user)
		await cacheDB.set("user-stats", { total: 1, inactive: 0 }, 60)
		await sut.execute(input)
		const cachedStats = await cacheDB.get("user-stats")
		expect(cachedStats).toBeNull()
	})
})
