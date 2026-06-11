import { beforeEach, describe, expect, test } from "vitest"

import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"

import { GetUnreadCountUseCase } from "./get-unread-count.usecase"

function makeNotification(userId = "user-1") {
	return Notification.create({
		userId,
		type: "CHECK_IN_APPROVED",
		title: "Check-in aprovado",
		message: "Aprovado",
	})
}

describe("GetUnreadCountUseCase", () => {
	let repository: InMemoryNotificationRepository
	let sut: GetUnreadCountUseCase

	beforeEach(() => {
		repository = new InMemoryNotificationRepository()
		sut = new GetUnreadCountUseCase(repository)
	})

	test("should return 0 when no unread notifications", async () => {
		const result = await sut.execute({ userId: "user-1" })
		expect(result.isSuccess()).toBe(true)
		expect(result.value.count).toBe(0)
	})

	test("should return count of unread notifications", async () => {
		await repository.save(makeNotification("user-1"))
		await repository.save(makeNotification("user-1"))
		const read = makeNotification("user-1")
		read.markAsRead()
		await repository.save(read)

		const result = await sut.execute({ userId: "user-1" })
		expect(result.isSuccess()).toBe(true)
		expect(result.value.count).toBe(2)
	})
})
