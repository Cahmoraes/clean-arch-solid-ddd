import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { UserAlreadyAdminError } from "../error/user-already-admin-error"
import { UserIsNotActiveError } from "../error/user-is-not-active-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type {
	PromoteToAdminUseCase,
	PromoteToAdminUseCaseInput,
} from "./promote-to-admin.usecase"

describe("PromoteToAdminUseCase", () => {
	let sut: PromoteToAdminUseCase
	let userRepository: InMemoryUserRepository
	let cacheDB: CacheDB

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		cacheDB = container.get(SHARED_TYPES.Redis)
		sut = container.get(USER_TYPES.UseCases.PromoteToAdmin)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve promover um membro ativo a administrador", async () => {
		const input: PromoteToAdminUseCaseInput = { userId: "member-id" }
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

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		const updated = await userRepository.userOfId("member-id")
		expect(updated?.role).toBe("ADMIN")
	})

	test("Não deve promover usuário inexistente", async () => {
		const result = await sut.execute({ userId: "ghost-id" })
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("Não deve promover usuário com isSuperAdmin=true", async () => {
		const user = User.restore({
			id: "super-id",
			email: "super@test.com",
			name: "Super Admin",
			password: "hashed_password",
			role: "MEMBER",
			status: "activated",
			createdAt: new Date(),
			isSuperAdmin: true,
		})
		await userRepository.save(user)

		const result = await sut.execute({ userId: "super-id" })
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserIsSuperAdminError)
	})

	test("Não deve promover usuário suspenso", async () => {
		const user = (
			await User.create({
				id: "suspended-id",
				email: "suspended@test.com",
				name: "Suspended",
				password: "password",
				role: "MEMBER",
			})
		).forceSuccess().value
		user.suspend()
		await userRepository.save(user)

		const result = await sut.execute({ userId: "suspended-id" })
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserIsNotActiveError)
	})

	test("Não deve promover usuário que já é admin", async () => {
		const user = (
			await User.create({
				id: "admin-id",
				email: "already@admin.com",
				name: "Already Admin",
				password: "password",
				role: "ADMIN",
			})
		).forceSuccess().value
		await userRepository.save(user)

		const result = await sut.execute({ userId: "admin-id" })
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserAlreadyAdminError)
	})

	test("Deve invalidar o cache fetch-users após promover", async () => {
		const user = (
			await User.create({
				id: "cache-test-id",
				email: "cache@test.com",
				name: "Cache Test",
				password: "password",
				role: "MEMBER",
			})
		).forceSuccess().value
		await userRepository.save(user)
		await cacheDB.set("fetch-users:1:10", { data: [] }, 60)

		await sut.execute({ userId: "cache-test-id" })

		const cached = await cacheDB.get("fetch-users:1:10")
		expect(cached).toBeNull()
	})
})
