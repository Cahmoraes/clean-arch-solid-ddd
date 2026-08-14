import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { CacheDBMemory } from "@/shared/infra/database/redis/cache-db-memory"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"
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

	test("exclui usuários inelegíveis da escrita em massa e contabiliza em skipped", async () => {
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
		expect(result.value.updated).toBe(1)
		expect(result.value.requested).toBe(4)
		expect(result.value.skipped).toBe(3)
		const memberUpdated = await userRepository.userOfId("member-id")
		expect(memberUpdated?.status).toBe("suspended")
		const otherAdminUnchanged = await userRepository.userOfId("other-admin-id")
		expect(otherAdminUnchanged?.status).toBe("activated")
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

	test("seleção 100% elegível atualiza todos e não gera skipped", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		const member1 = restoreUser("member-1", "MEMBER")
		member1.suspend()
		await userRepository.save(member1)
		const member2 = restoreUser("member-2", "MEMBER")
		member2.suspend()
		await userRepository.save(member2)

		const result = await sut.execute({
			requesterId: "admin-id",
			userIds: ["member-1", "member-2"],
			targetStatus: "activated",
		})

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.updated).toBe(2)
		expect(result.value.requested).toBe(2)
		expect(result.value.skipped).toBe(0)
		const updatedMember1 = await userRepository.userOfId("member-1")
		expect(updatedMember1?.status).toBe("activated")
		const updatedMember2 = await userRepository.userOfId("member-2")
		expect(updatedMember2?.status).toBe("activated")
	})

	test("usuário locked selecionado para ativar em massa termina ativado (desbloqueio automático)", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		const lockedUser = restoreUser("locked-member", "MEMBER")
		lockedUser.lock()
		await userRepository.save(lockedUser)

		const result = await sut.execute({
			requesterId: "admin-id",
			userIds: ["locked-member"],
			targetStatus: "activated",
		})

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.updated).toBe(1)
		const updatedUser = await userRepository.userOfId("locked-member")
		expect(updatedUser?.status).toBe("activated")
	})

	test("uma segunda chamada idêntica retorna updated: 0 (idempotência)", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("member-1", "MEMBER"))

		const firstResult = await sut.execute({
			requesterId: "admin-id",
			userIds: ["member-1"],
			targetStatus: "suspended",
		})
		expect(firstResult.isSuccess()).toBe(true)
		if (!firstResult.isSuccess()) return
		expect(firstResult.value.updated).toBe(1)

		const secondResult = await sut.execute({
			requesterId: "admin-id",
			userIds: ["member-1"],
			targetStatus: "suspended",
		})
		expect(secondResult.isSuccess()).toBe(true)
		if (!secondResult.isSuccess()) return
		expect(secondResult.value.updated).toBe(0)
		expect(secondResult.value.skipped).toBe(1)
	})

	test("IDs duplicados na mesma requisição são deduplicados antes de calcular requested/skipped", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("member-1", "MEMBER"))

		const result = await sut.execute({
			requesterId: "admin-id",
			userIds: ["member-1", "member-1", "member-1"],
			targetStatus: "suspended",
		})

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.updated).toBe(1)
		expect(result.value.requested).toBe(1)
		expect(result.value.skipped).toBe(0)
	})

	test("deve publicar um UserStatusChangedEvent por usuário efetivamente alterado, ignorando quem já está no status alvo", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("member-a-id", "MEMBER"))
		await userRepository.save(
			User.restore({
				id: "member-b-id",
				name: "User member-b-id",
				email: "member-b-id@test.com",
				role: "MEMBER",
				status: "suspended",
				createdAt: new Date(),
				isSuperAdmin: false,
			}),
		)

		const receivedEvents: UserStatusChangedEvent[] = []
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof UserStatusChangedEvent) receivedEvents.push(event)
		}
		DomainEventPublisher.instance.subscribe("userStatusChanged", subscriber)

		try {
			const input: BulkChangeUserStatusUseCaseInput = {
				requesterId: "admin-id",
				userIds: ["member-a-id", "member-b-id"],
				targetStatus: "suspended",
			}
			const result = await sut.execute(input)
			expect(result.isSuccess()).toBe(true)
			if (!result.isSuccess()) return
			expect(result.value.updated).toBe(1)
		} finally {
			DomainEventPublisher.instance.unsubscribe("userStatusChanged", subscriber)
		}

		expect(receivedEvents).toHaveLength(1)
		expect(receivedEvents[0]).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({
					userId: "member-a-id",
					previousStatus: "activated",
					newStatus: "suspended",
				}),
			}),
		)
	})
})
