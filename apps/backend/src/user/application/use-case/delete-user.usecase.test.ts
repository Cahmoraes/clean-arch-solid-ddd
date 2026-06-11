import {
	type CreateAndSaveUserProps,
	createAndSaveUser,
} from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { CannotDeleteSelfError } from "../error/cannot-delete-self-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type {
	DeleteUserUseCase,
	DeleteUserUseCaseInput,
} from "./delete-user.usecase"

describe("DeleteUserUseCase (soft delete)", () => {
	let sut: DeleteUserUseCase
	let userRepository: InMemoryUserRepository
	let cacheDB: CacheDB

	beforeEach(() => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		cacheDB = container.get(SHARED_TYPES.Redis)
		sut = container.get(USER_TYPES.UseCases.DeleteUser)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve soft-deletar um usuário (ele some das leituras)", async () => {
		const props: CreateAndSaveUserProps = {
			userRepository,
			id: "target-id",
			email: "john@mail.com",
			password: "12345678",
		}
		const user = await createAndSaveUser(props)
		const input: DeleteUserUseCaseInput = {
			userId: user.id,
			requesterId: "admin-id",
		}
		const result = await sut.execute(input)
		expect(result.isSuccess()).toBe(true)
		expect(await userRepository.userOfId(user.id)).toBeNull()
	})

	test("Não deve permitir auto-exclusão (userId === requesterId)", async () => {
		const result = await sut.execute({
			userId: "same-id",
			requesterId: "same-id",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(CannotDeleteSelfError)
	})

	test("Não deve soft-deletar um usuário inexistente", async () => {
		const result = await sut.execute({
			userId: "ghost-id",
			requesterId: "admin-id",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("Não deve soft-deletar um super admin", async () => {
		const superAdmin = User.restore({
			id: "super-id",
			email: "super@test.com",
			name: "Super Admin",
			password: "hashed_password",
			role: "ADMIN",
			status: "activated",
			createdAt: new Date(),
			isSuperAdmin: true,
		})
		await userRepository.save(superAdmin)
		const result = await sut.execute({
			userId: "super-id",
			requesterId: "admin-id",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserIsSuperAdminError)
	})

	test("Deve soft-deletar mesmo com check-ins (sem bloqueio)", async () => {
		const props: CreateAndSaveUserProps = {
			userRepository,
			id: "target-checkins",
			email: "withcheckins@mail.com",
			password: "12345678",
		}
		const user = await createAndSaveUser(props)
		const result = await sut.execute({
			userId: user.id,
			requesterId: "admin-id",
		})
		expect(result.isSuccess()).toBe(true)
	})

	test("Deve invalidar os caches fetch-users e user-stats", async () => {
		const props: CreateAndSaveUserProps = {
			userRepository,
			id: "cache-target",
			email: "cache@mail.com",
			password: "12345678",
		}
		const user = await createAndSaveUser(props)
		await cacheDB.set("fetch-users:1:10", { data: [] }, 60)
		await cacheDB.set("user-stats", { total: 1 }, 60)
		await sut.execute({ userId: user.id, requesterId: "admin-id" })
		expect(await cacheDB.get("fetch-users:1:10")).toBeNull()
		expect(await cacheDB.get("user-stats")).toBeNull()
	})
})
