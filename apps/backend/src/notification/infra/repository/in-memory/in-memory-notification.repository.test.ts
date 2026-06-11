import { beforeEach, describe, expect, test } from "vitest"

import { Notification } from "@/notification/domain/notification"

import { InMemoryNotificationRepository } from "./in-memory-notification.repository"

function makeNotification(
	overrides?: Partial<Parameters<typeof Notification.create>[0]>,
) {
	return Notification.create({
		userId: "user-1",
		type: "CHECK_IN_APPROVED",
		title: "Check-in aprovado",
		message: "Aprovado",
		...overrides,
	})
}

describe("InMemoryNotificationRepository", () => {
	let sut: InMemoryNotificationRepository

	beforeEach(() => {
		sut = new InMemoryNotificationRepository()
	})

	test("save() should persist a notification", async () => {
		const notification = makeNotification()
		const result = await sut.save(notification)
		expect(result.id).toBe(notification.id)
		expect(sut.notifications.size).toBe(1)
	})

	test("save() should update an existing notification", async () => {
		const notification = makeNotification({ id: "notif-1" })
		await sut.save(notification)
		notification.markAsRead()
		await sut.save(notification)

		expect(sut.notifications.size).toBe(1)
		const stored = await sut.findById("notif-1")
		expect(stored?.isRead).toBe(true)
	})

	test("findById() should return null for unknown id", async () => {
		const result = await sut.findById("unknown")
		expect(result).toBeNull()
	})

	test("findById() should return the notification", async () => {
		const notification = makeNotification({ id: "notif-1" })
		await sut.save(notification)
		const result = await sut.findById("notif-1")
		expect(result?.id).toBe("notif-1")
	})

	test("findManyByUserId() should return only the user's notifications", async () => {
		await sut.save(makeNotification({ userId: "user-1" }))
		await sut.save(makeNotification({ userId: "user-1" }))
		await sut.save(makeNotification({ userId: "user-2" }))

		const result = await sut.findManyByUserId({ userId: "user-1", page: 1 })
		expect(result.items).toHaveLength(2)
		expect(result.total).toBe(2)
	})

	test("findManyByUserId() with onlyUnread=true should filter read notifications", async () => {
		const n1 = makeNotification({ userId: "user-1" })
		const n2 = makeNotification({ userId: "user-1" })
		n2.markAsRead()
		await sut.save(n1)
		await sut.save(n2)

		const result = await sut.findManyByUserId({
			userId: "user-1",
			page: 1,
			onlyUnread: true,
		})
		expect(result.items).toHaveLength(1)
		expect(result.total).toBe(1)
	})

	test("countUnreadByUserId() should return count of unread notifications", async () => {
		await sut.save(makeNotification({ userId: "user-1" }))
		const n2 = makeNotification({ userId: "user-1" })
		n2.markAsRead()
		await sut.save(n2)

		const count = await sut.countUnreadByUserId("user-1")
		expect(count).toBe(1)
	})

	test("markAllAsReadByUserId() should mark all unread notifications as read", async () => {
		await sut.save(makeNotification({ userId: "user-1" }))
		await sut.save(makeNotification({ userId: "user-1" }))

		await sut.markAllAsReadByUserId("user-1")

		const count = await sut.countUnreadByUserId("user-1")
		expect(count).toBe(0)
	})

	test("markAllAsReadByUserId() should not affect other users", async () => {
		await sut.save(makeNotification({ userId: "user-1" }))
		await sut.save(makeNotification({ userId: "user-2" }))

		await sut.markAllAsReadByUserId("user-1")

		const countUser2 = await sut.countUnreadByUserId("user-2")
		expect(countUser2).toBe(1)
	})
})
