import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { InMemoryLoginAttemptStore } from "@/shared/infra/database/repository/in-memory/in-memory-login-attempt-store"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { StatusTypes } from "@/user/domain/value-object/status"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type {
	ActiveUserUseCase,
	ActiveUserUseCaseInput,
} from "./active-user.usecase"

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

describe("ActiveUserUseCase", () => {
	let sut: ActiveUserUseCase
	let userRepository: InMemoryUserRepository
	let cacheDB: CacheDB
	let loginAttemptStore: InMemoryLoginAttemptStore

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		loginAttemptStore = repositories.loginAttemptStore
		cacheDB = container.get(SHARED_TYPES.Redis)
		sut = container.get(USER_TYPES.UseCases.ActivateUser)
		await userRepository.save(restoreUser(ROOT_ID, "ADMIN", true))
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve ativar um usuário", async () => {
		const input: ActiveUserUseCaseInput = {
			requesterId: ROOT_ID,
			userId: "any_user_id",
		}
		const user = (
			await User.create({
				email: "user@email.com",
				name: "any_name",
				password: "any_password",
				id: input.userId,
				status: "suspended",
			})
		).forceSuccess().value
		await userRepository.save(user)
		await sut.execute(input)
		const userFound = await userRepository.userOfId(input.userId)
		expect(userFound?.isActive).toBe(true)
	})

	test("Não deve ativar um usuário inexistente", async () => {
		const input: ActiveUserUseCaseInput = {
			requesterId: ROOT_ID,
			userId: "any_user_id",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("Deve limpar o Redis lock ao ativar uma conta bloqueada por segurança", async () => {
		const lockedUser = User.restore({
			id: "locked-user-id",
			name: "Locked User",
			email: "locked@test.com",
			role: "MEMBER",
			status: StatusTypes.LOCKED,
			createdAt: new Date(),
		})
		await userRepository.save(lockedUser)
		await loginAttemptStore.setLocked("locked-user-id")

		expect(await loginAttemptStore.isLocked("locked-user-id")).toBe(true)

		const result = await sut.execute({
			requesterId: ROOT_ID,
			userId: "locked-user-id",
		})

		expect(result.isSuccess()).toBe(true)
		const user = await userRepository.userOfId("locked-user-id")
		expect(user?.isActive).toBe(true)

		await new Promise((resolve) => setTimeout(resolve, 10))
		expect(await loginAttemptStore.isLocked("locked-user-id")).toBe(false)
	})

	test("Não deve falhar ao ativar usuário que não tem lock no Redis", async () => {
		const activeUser = User.restore({
			id: "active-user-id",
			name: "Active User",
			email: "active@test.com",
			role: "MEMBER",
			status: StatusTypes.ACTIVATED,
			createdAt: new Date(),
		})
		await userRepository.save(activeUser)

		const result = await sut.execute({
			requesterId: ROOT_ID,
			userId: "active-user-id",
		})

		expect(result.isSuccess()).toBe(true)
	})

	test("Deve invalidar o cache fetch-users após ativar um usuário", async () => {
		const input: ActiveUserUseCaseInput = {
			requesterId: ROOT_ID,
			userId: "any_user_id",
		}
		const user = (
			await User.create({
				email: "user@email.com",
				name: "any_name",
				password: "any_password",
				id: input.userId,
				status: "suspended",
			})
		).forceSuccess().value
		await userRepository.save(user)
		await cacheDB.set("fetch-users:1:10", { data: [] }, 60)
		await cacheDB.set("fetch-users:2:20", { data: [] }, 60)
		await sut.execute(input)
		const page1 = await cacheDB.get("fetch-users:1:10")
		const page2 = await cacheDB.get("fetch-users:2:20")
		expect(page1).toBeNull()
		expect(page2).toBeNull()
	})

	test("Deve invalidar o cache user-stats após ativar um usuário", async () => {
		const input: ActiveUserUseCaseInput = {
			requesterId: ROOT_ID,
			userId: "any_user_id",
		}
		const user = (
			await User.create({
				email: "user@email.com",
				name: "any_name",
				password: "any_password",
				id: input.userId,
				status: "suspended",
			})
		).forceSuccess().value
		await userRepository.save(user)
		await cacheDB.set("user-stats", { total: 1, active: 0 }, 60)
		await sut.execute(input)
		const cachedStats = await cacheDB.get("user-stats")
		expect(cachedStats).toBeNull()
	})

	test("Admin comum não ativa outro admin (403)", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(
			User.restore({
				id: "other-admin",
				name: "Other Admin",
				email: "other-admin@test.com",
				role: "ADMIN",
				status: "suspended",
				createdAt: new Date(),
			}),
		)

		const result = await sut.execute({
			requesterId: "admin-id",
			userId: "other-admin",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})

	test("Ninguém ativa o super admin (403)", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(
			User.restore({
				id: "root",
				name: "Root",
				email: "root@test.com",
				role: "ADMIN",
				status: "suspended",
				createdAt: new Date(),
				isSuperAdmin: true,
			}),
		)

		const result = await sut.execute({
			requesterId: "admin-id",
			userId: "root",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})

	test("Admin comum ativa um membro com sucesso", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(
			User.restore({
				id: "member-id",
				name: "Member",
				email: "member@test.com",
				role: "MEMBER",
				status: "suspended",
				createdAt: new Date(),
			}),
		)

		const result = await sut.execute({
			requesterId: "admin-id",
			userId: "member-id",
		})

		expect(result.isSuccess()).toBe(true)
		const updated = await userRepository.userOfId("member-id")
		expect(updated?.status).toBe("activated")
	})

	test("Requester inexistente recebe 403", async () => {
		await userRepository.save(
			User.restore({
				id: "member-id",
				name: "Member",
				email: "member@test.com",
				role: "MEMBER",
				status: "suspended",
				createdAt: new Date(),
			}),
		)

		const result = await sut.execute({
			requesterId: "ghost-id",
			userId: "member-id",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})
})
