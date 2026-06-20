import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { CannotDemoteSelfError } from "../error/cannot-demote-self-error"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserIsNotAdminError } from "../error/user-is-not-admin-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type {
	DemoteFromAdminUseCase,
	DemoteFromAdminUseCaseInput,
} from "./demote-from-admin.usecase"

function makeRoot(id = "root-id"): User {
	return User.restore({
		id,
		name: "Root User",
		email: "root@test.com",
		password: "hashed_password",
		role: "ADMIN",
		status: "activated",
		createdAt: new Date(),
		isSuperAdmin: true,
	})
}

describe("DemoteFromAdminUseCase", () => {
	let sut: DemoteFromAdminUseCase
	let userRepository: InMemoryUserRepository
	let cacheDB: CacheDB

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		cacheDB = container.get(SHARED_TYPES.Redis)
		sut = container.get(USER_TYPES.UseCases.DemoteFromAdmin)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve demover um administrador a membro", async () => {
		await userRepository.save(makeRoot())
		const user = (
			await User.create({
				id: "admin-id",
				email: "admin@test.com",
				name: "Admin User",
				password: "password",
				role: "ADMIN",
			})
		).forceSuccess().value
		await userRepository.save(user)

		const input: DemoteFromAdminUseCaseInput = {
			userId: "admin-id",
			requesterId: "root-id",
		}
		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		const updated = await userRepository.userOfId("admin-id")
		expect(updated?.role).toBe("MEMBER")
	})

	test("Admin comum não pode rebaixar outro admin (root-only — 403)", async () => {
		const commonAdmin = (
			await User.create({
				id: "common-admin-id",
				email: "common@test.com",
				name: "Common Admin",
				password: "password",
				role: "ADMIN",
			})
		).forceSuccess().value
		await userRepository.save(commonAdmin)

		const targetAdmin = (
			await User.create({
				id: "target-admin-id",
				email: "target@test.com",
				name: "Target Admin",
				password: "password",
				role: "ADMIN",
			})
		).forceSuccess().value
		await userRepository.save(targetAdmin)

		const result = await sut.execute({
			requesterId: "common-admin-id",
			userId: "target-admin-id",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})

	test("Root rebaixa um admin a membro com sucesso", async () => {
		await userRepository.save(makeRoot())
		const targetAdmin = (
			await User.create({
				id: "target-admin-id",
				email: "target@test.com",
				name: "Target Admin",
				password: "password",
				role: "ADMIN",
			})
		).forceSuccess().value
		await userRepository.save(targetAdmin)

		const result = await sut.execute({
			requesterId: "root-id",
			userId: "target-admin-id",
		})

		expect(result.isSuccess()).toBe(true)
		const updated = await userRepository.userOfId("target-admin-id")
		expect(updated?.role).toBe("MEMBER")
	})

	test("Não deve demover usuário inexistente", async () => {
		await userRepository.save(makeRoot())
		const result = await sut.execute({
			userId: "ghost-id",
			requesterId: "root-id",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("Não deve permitir auto-demoção (userId === requesterId)", async () => {
		const result = await sut.execute({
			userId: "same-id",
			requesterId: "same-id",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(CannotDemoteSelfError)
	})

	test("Retorna NotAllowedToManageUserError quando requesterId não existe", async () => {
		const result = await sut.execute({
			userId: "any-user-id",
			requesterId: "nonexistent-requester",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})

	test("Não deve demover usuário com isSuperAdmin=true", async () => {
		await userRepository.save(makeRoot("root-id"))
		const superTarget = User.restore({
			id: "super-id",
			email: "super@test.com",
			name: "Super Admin",
			password: "hashed_password",
			role: "ADMIN",
			status: "activated",
			createdAt: new Date(),
			isSuperAdmin: true,
		})
		await userRepository.save(superTarget)

		const result = await sut.execute({
			userId: "super-id",
			requesterId: "root-id",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserIsSuperAdminError)
	})

	test("Não deve demover usuário que não é admin", async () => {
		await userRepository.save(makeRoot())
		const user = (
			await User.create({
				id: "member-id",
				email: "member@test.com",
				name: "Member",
				password: "password",
				role: "MEMBER",
			})
		).forceSuccess().value
		await userRepository.save(user)

		const result = await sut.execute({
			userId: "member-id",
			requesterId: "root-id",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserIsNotAdminError)
	})

	test("Deve invalidar o cache fetch-users após demover", async () => {
		await userRepository.save(makeRoot())
		const user = (
			await User.create({
				id: "cache-admin-id",
				email: "cache-admin@test.com",
				name: "Cache Admin",
				password: "password",
				role: "ADMIN",
			})
		).forceSuccess().value
		await userRepository.save(user)
		await cacheDB.set("fetch-users:1:10", { data: [] }, 60)

		await sut.execute({ userId: "cache-admin-id", requesterId: "root-id" })

		const cached = await cacheDB.get("fetch-users:1:10")
		expect(cached).toBeNull()
	})

	test("Deve invalidar o cache user-stats após demover", async () => {
		await userRepository.save(makeRoot())
		const user = (
			await User.create({
				id: "cache-stats-admin-id",
				email: "cache-stats-admin@test.com",
				name: "Cache Stats Admin",
				password: "password",
				role: "ADMIN",
			})
		).forceSuccess().value
		await userRepository.save(user)
		await cacheDB.set("user-stats", { total: 1, members: 0, admins: 1 }, 60)

		await sut.execute({
			userId: "cache-stats-admin-id",
			requesterId: "root-id",
		})

		const cachedStats = await cacheDB.get("user-stats")
		expect(cachedStats).toBeNull()
	})
})
