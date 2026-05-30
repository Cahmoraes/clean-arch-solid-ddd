import { beforeEach, describe, expect, test } from "vitest"

import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"

import { MarkAllAsReadUseCase } from "./mark-all-as-read.usecase"

function makeNotification(userId = "user-1") {
	return Notification.create({
		userId,
		type: "CHECK_IN_APPROVED",
		title: "Aprovado",
		message: "Aprovado",
	})
}

describe("MarkAllAsReadUseCase", () => {
	let repository: InMemoryNotificationRepository
	let sut: MarkAllAsReadUseCase

	beforeEach(() => {
		repository = new InMemoryNotificationRepository()
		sut = new MarkAllAsReadUseCase(repository)
	})

	test("should mark all unread notifications as read", async () => {
		await repository.save(makeNotification("user-1"))
		await repository.save(makeNotification("user-1"))

		const result = await sut.execute({ userId: "user-1" })

		expect(result.isSuccess()).toBe(true)
		expect(result.value.markedCount).toBe(2)

		const count = await repository.countUnreadByUserId("user-1")
		expect(count).toBe(0)
	})

	test("should return markedCount=0 when no unread notifications", async () => {
		const result = await sut.execute({ userId: "user-1" })

		expect(result.isSuccess()).toBe(true)
		expect(result.value.markedCount).toBe(0)
	})

	test("should not affect other users", async () => {
		await repository.save(makeNotification("user-1"))
		await repository.save(makeNotification("user-2"))

		await sut.execute({ userId: "user-1" })

		const countUser2 = await repository.countUnreadByUserId("user-2")
		expect(countUser2).toBe(1)
	})
})
