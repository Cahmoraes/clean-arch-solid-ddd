import { CacheDBMemory } from "@/shared/infra/database/redis/cache-db-memory"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { User } from "@/user/domain/user"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import {
	BulkChangeUserStatusUseCase,
	type BulkChangeUserStatusUseCaseInput,
} from "./bulk-change-user-status.usecase"

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

describe("BulkChangeUserStatusUseCase", () => {
	let sut: BulkChangeUserStatusUseCase
	let userRepository: InMemoryUserRepository

	beforeEach(() => {
		userRepository = new InMemoryUserRepository()
		sut = new BulkChangeUserStatusUseCase(userRepository, new CacheDBMemory())
	})

	test("exclui de eligibleIds o próprio requester, outro admin e o super admin, contabilizando em skippedCount", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("other-admin-id", "ADMIN"))
		await userRepository.save(restoreUser("root-id", "ADMIN", true))
		await userRepository.save(restoreUser("member-id", "MEMBER"))

		const input: BulkChangeUserStatusUseCaseInput = {
			requesterId: "admin-id",
			userIds: ["admin-id", "other-admin-id", "root-id", "member-id"],
			targetStatus: "suspended",
		}

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.eligibleIds).toEqual(["member-id"])
		expect(result.value.skippedCount).toBe(3)
		expect(result.value.requestedCount).toBe(4)
	})

	test("requester inexistente falha fechado com NotAllowedToManageUserError", async () => {
		const result = await sut.execute({
			requesterId: "requester-inexistente",
			userIds: ["member-id"],
			targetStatus: "suspended",
		})

		expect(result.isFailure()).toBe(true)
		if (!result.isFailure()) return
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})

	test("seleção 100% elegível não gera skippedCount", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("member-1", "MEMBER"))
		await userRepository.save(restoreUser("member-2", "MEMBER"))

		const result = await sut.execute({
			requesterId: "admin-id",
			userIds: ["member-1", "member-2"],
			targetStatus: "activated",
		})

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.eligibleIds.sort()).toEqual(["member-1", "member-2"])
		expect(result.value.skippedCount).toBe(0)
		expect(result.value.requestedCount).toBe(2)
	})
})
