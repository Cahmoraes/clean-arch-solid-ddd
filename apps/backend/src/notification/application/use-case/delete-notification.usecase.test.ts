import { beforeEach, describe, expect, test } from "vitest"
import { NotificationNotFoundError } from "@/notification/domain/errors/notification-not-found-error"
import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"

import { DeleteNotificationUseCase } from "./delete-notification.usecase"

describe("DeleteNotificationUseCase", () => {
	let repository: InMemoryNotificationRepository
	let sut: DeleteNotificationUseCase

	beforeEach(() => {
		repository = new InMemoryNotificationRepository()
		sut = new DeleteNotificationUseCase(repository)
	})

	test("deve excluir a notificação do usuário e ela some da listagem, preservando o registro [FR-005, FR-007]", async () => {
		const notification = Notification.create({
			id: "notif-1",
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Aprovado",
			message: "Aprovado",
		})
		await repository.save(notification)

		const result = await sut.execute({
			notificationId: "notif-1",
			userId: "user-1",
		})

		expect(result.isSuccess()).toBe(true)
		const stored = await repository.findById("notif-1")
		expect(stored).not.toBeNull()
		expect(stored?.isDeleted).toBe(true)
		const listed = await repository.findManyByUserId({
			userId: "user-1",
			page: 1,
		})
		expect(listed.items).toHaveLength(0)
		expect(listed.total).toBe(0)
	})

	test("deve retornar NotificationNotFoundError quando a notificação não existe [FR-006]", async () => {
		const result = await sut.execute({
			notificationId: "unknown",
			userId: "user-1",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotificationNotFoundError)
	})

	test("deve retornar NotificationNotFoundError e não alterar a notificação de outro usuário [FR-004, FR-006]", async () => {
		const notification = Notification.create({
			id: "notif-1",
			userId: "user-2",
			type: "CHECK_IN_APPROVED",
			title: "Aprovado",
			message: "Aprovado",
		})
		await repository.save(notification)

		const result = await sut.execute({
			notificationId: "notif-1",
			userId: "user-1",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotificationNotFoundError)
		const stored = await repository.findById("notif-1")
		expect(stored?.isDeleted).toBe(false)
		const ownerList = await repository.findManyByUserId({
			userId: "user-2",
			page: 1,
		})
		expect(ownerList.items).toHaveLength(1)
	})

	test("Review Focus: excluir de novo uma notificação já excluída retorna NotificationNotFoundError, nunca sucesso [FR-006]", async () => {
		const notification = Notification.create({
			id: "notif-1",
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Aprovado",
			message: "Aprovado",
		})
		await repository.save(notification)
		const first = await sut.execute({
			notificationId: "notif-1",
			userId: "user-1",
		})
		expect(first.isSuccess()).toBe(true)

		const second = await sut.execute({
			notificationId: "notif-1",
			userId: "user-1",
		})

		expect(second.isFailure()).toBe(true)
		expect(second.value).toBeInstanceOf(NotificationNotFoundError)
	})
})
