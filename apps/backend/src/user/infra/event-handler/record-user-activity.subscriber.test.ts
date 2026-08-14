import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { InMemoryUserActivityRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-activity-repository"
import type { UserActivityRepository } from "@/user/application/persistence/repository/user-activity-repository"
import { AccountLockedBySecurityEvent } from "@/user/domain/event/account-locked-by-security-event"
import { GoogleAccountLinkedEvent } from "@/user/domain/event/google-account-linked-event"
import { LoginSucceededEvent } from "@/user/domain/event/login-succeeded.event"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
import { UserRoleChangedEvent } from "@/user/domain/event/user-role-changed.event"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"
import { RecordUserActivitySubscriber } from "./record-user-activity.subscriber"

describe("RecordUserActivitySubscriber", () => {
	let repository: InMemoryUserActivityRepository
	let sut: RecordUserActivitySubscriber

	beforeEach(() => {
		repository = new InMemoryUserActivityRepository()
		sut = new RecordUserActivitySubscriber(repository)
		sut.subscribe()
	})

	afterEach(() => {
		sut.unsubscribe()
	})

	test("deve gravar atividade LOGIN ao publicar LoginSucceededEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new LoginSucceededEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				userName: "John Doe",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "LOGIN",
			description: "Login realizado",
		})
	})

	test("deve gravar atividade PASSWORD_CHANGED ao publicar PasswordChangedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new PasswordChangedEvent({
				userId: "user-1",
				userName: "John Doe",
				userEmail: "john@doe.com",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "PASSWORD_CHANGED",
			description: "Senha alterada",
		})
	})

	test("deve gravar atividade GOOGLE_LINKED ao publicar GoogleAccountLinkedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new GoogleAccountLinkedEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				googleId: "google-sub-123",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "GOOGLE_LINKED",
			description: "Conta Google vinculada",
		})
	})

	test("deve gravar atividade ACCOUNT_LOCKED ao publicar AccountLockedBySecurityEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new AccountLockedBySecurityEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				userName: "John Doe",
				resetToken: "raw-token",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "ACCOUNT_LOCKED",
			description: "Conta bloqueada por segurança",
		})
	})

	test("deve gravar atividade PROFILE_UPDATED ao publicar UserProfileUpdatedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new UserProfileUpdatedEvent({
				userId: "user-1",
				name: "John Doe Jr.",
				email: "john@doe.com",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "PROFILE_UPDATED",
			description: "Perfil atualizado",
		})
	})

	test("deve gravar atividade ROLE_CHANGED com metadata ao publicar UserRoleChangedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new UserRoleChangedEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				userName: "John Doe",
				previousRole: "MEMBER",
				newRole: "ADMIN",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "ROLE_CHANGED",
			description: "Role alterada para Administrador",
			metadata: { previousRole: "MEMBER", newRole: "ADMIN" },
		})
	})

	test("deve gravar atividade STATUS_CHANGED com metadata ao publicar UserStatusChangedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new UserStatusChangedEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				userName: "John Doe",
				previousStatus: "activated",
				newStatus: "suspended",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "STATUS_CHANGED",
			description: "Conta suspensa",
			metadata: { previousStatus: "activated", newStatus: "suspended" },
		})
	})

	test("uma falha ao gravar não deve propagar (FR-014)", async () => {
		const failingRepository: UserActivityRepository = {
			record: vi.fn().mockRejectedValue(new Error("db down")),
		}
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined)
		const failingSut = new RecordUserActivitySubscriber(failingRepository)
		failingSut.subscribe()

		try {
			await expect(
				DomainEventPublisher.instance.publish(
					new LoginSucceededEvent({
						userId: "user-1",
						userEmail: "john@doe.com",
						userName: "John Doe",
					}),
				),
			).resolves.toBeUndefined()

			expect(failingRepository.record).toHaveBeenCalledTimes(1)
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("userId=user-1 type=LOGIN"),
				expect.any(Error),
			)
		} finally {
			failingSut.unsubscribe()
			consoleErrorSpy.mockRestore()
		}
	})
})
