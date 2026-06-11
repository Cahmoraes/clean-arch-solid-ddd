import { beforeEach, describe, expect, test } from "vitest"
import { NotificationNotFoundError } from "@/notification/domain/errors/notification-not-found-error"
import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"

import { MarkAsReadUseCase } from "./mark-as-read.usecase"

describe("MarkAsReadUseCase", () => {
	let repository: InMemoryNotificationRepository
	let sut: MarkAsReadUseCase

	beforeEach(() => {
		repository = new InMemoryNotificationRepository()
		sut = new MarkAsReadUseCase(repository)
	})

	test("should mark notification as read", async () => {
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
		expect(result.forceSuccess().value.readAt).toBeInstanceOf(Date)

		const stored = await repository.findById("notif-1")
		expect(stored?.isRead).toBe(true)
	})

	test("should return NotificationNotFoundError when notification does not exist", async () => {
		const result = await sut.execute({
			notificationId: "unknown",
			userId: "user-1",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotificationNotFoundError)
	})

	test("should return NotificationNotFoundError when notification belongs to another user", async () => {
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
	})
})
