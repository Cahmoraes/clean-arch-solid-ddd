import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type {
	SuspendUserUseCase,
	SuspendUserUseCaseInput,
} from "./suspend-user.usecase"

function restoreUser(
	id: string,
	role: "ADMIN" | "MEMBER",
	isSuperAdmin = false,
): User {
	return User.restore({
		id,
		name: `User ${id}`,
		email: `${id}@test.com`,
		role,
		status: "activated",
		createdAt: new Date(),
		isSuperAdmin,
	})
}

const ROOT_ID = "root-id"

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
		await userRepository.save(restoreUser(ROOT_ID, "ADMIN", true))
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve suspender um usuário", async () => {
		const input: SuspendUserUseCaseInput = {
			requesterId: ROOT_ID,
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
			requesterId: ROOT_ID,
			userId: "any_user_id",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("Deve invalidar o cache fetch-users após suspender um usuário", async () => {
		const input: SuspendUserUseCaseInput = {
			requesterId: ROOT_ID,
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
			requesterId: ROOT_ID,
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

	test("Admin comum não suspende outro admin (403)", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("other-admin", "ADMIN"))

		const result = await sut.execute({
			requesterId: "admin-id",
			userId: "other-admin",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})

	test("Ninguém suspende o super admin (403)", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("root", "ADMIN", true))

		const result = await sut.execute({
			requesterId: "admin-id",
			userId: "root",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})

	test("Admin comum suspende um membro com sucesso", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(
			User.restore({
				id: "member-id",
				name: "Member",
				email: "member@test.com",
				role: "MEMBER",
				status: "activated",
				createdAt: new Date(),
			}),
		)

		const result = await sut.execute({
			requesterId: "admin-id",
			userId: "member-id",
		})

		expect(result.isSuccess()).toBe(true)
		const updated = await userRepository.userOfId("member-id")
		expect(updated?.status).toBe("suspended")
	})

	test("Requester inexistente recebe 403", async () => {
		await userRepository.save(restoreUser("member-id", "MEMBER"))

		const result = await sut.execute({
			requesterId: "ghost-id",
			userId: "member-id",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})
})
