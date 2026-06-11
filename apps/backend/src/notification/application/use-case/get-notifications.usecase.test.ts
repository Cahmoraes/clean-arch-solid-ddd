import { beforeEach, describe, expect, test } from "vitest"

import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"

import { GetNotificationsUseCase } from "./get-notifications.usecase"

function makeNotification(userId = "user-1") {
	return Notification.create({
		userId,
		type: "CHECK_IN_APPROVED",
		title: "Check-in aprovado",
		message: "Aprovado",
	})
}

describe("GetNotificationsUseCase", () => {
	let repository: InMemoryNotificationRepository
	let sut: GetNotificationsUseCase

	beforeEach(() => {
		repository = new InMemoryNotificationRepository()
		sut = new GetNotificationsUseCase(repository)
	})

	test("should return empty list when user has no notifications", async () => {
		const result = await sut.execute({ userId: "user-1", page: 1 })

		expect(result.isSuccess()).toBe(true)
		expect(result.value.items).toHaveLength(0)
		expect(result.value.total).toBe(0)
	})

	test("should return notifications for the user", async () => {
		await repository.save(makeNotification("user-1"))
		await repository.save(makeNotification("user-1"))
		await repository.save(makeNotification("user-2"))

		const result = await sut.execute({ userId: "user-1", page: 1 })

		expect(result.isSuccess()).toBe(true)
		expect(result.value.items).toHaveLength(2)
		expect(result.value.total).toBe(2)
	})

	test("should filter by onlyUnread=true", async () => {
		const n1 = makeNotification("user-1")
		const n2 = makeNotification("user-1")
		n2.markAsRead()
		await repository.save(n1)
		await repository.save(n2)

		const result = await sut.execute({
			userId: "user-1",
			page: 1,
			onlyUnread: true,
		})

		expect(result.isSuccess()).toBe(true)
		expect(result.value.items).toHaveLength(1)
	})
})
