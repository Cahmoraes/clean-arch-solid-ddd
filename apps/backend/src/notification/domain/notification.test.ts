import { describe, expect, test } from "vitest"
import { NotificationNotFoundError } from "./errors/notification-not-found-error"
import { Notification } from "./notification"

describe("Notification.create()", () => {
	test("should create a notification with default values", () => {
		const notification = Notification.create({
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Check-in aprovado",
			message: "Seu check-in foi aprovado.",
		})

		expect(notification.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		)
		expect(notification.userId).toBe("user-1")
		expect(notification.type).toBe("CHECK_IN_APPROVED")
		expect(notification.title).toBe("Check-in aprovado")
		expect(notification.message).toBe("Seu check-in foi aprovado.")
		expect(notification.readAt).toBeUndefined()
		expect(notification.deletedAt).toBeUndefined()
		expect(notification.isRead).toBe(false)
		expect(notification.isDeleted).toBe(false)
		expect(notification.createdAt).toBeInstanceOf(Date)
	})

	test("should create a notification with a fixed id when provided", () => {
		const notification = Notification.create({
			id: "fixed-id",
			userId: "user-1",
			type: "CHECK_IN_REJECTED",
			title: "Check-in rejeitado",
			message: "Seu check-in foi rejeitado.",
			reason: "Tempo excedido",
		})

		expect(notification.id).toBe("fixed-id")
		expect(notification.reason).toBe("Tempo excedido")
	})

	test("should create a notification with gymName", () => {
		const notification = Notification.create({
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Check-in aprovado",
			message: "Seu check-in foi aprovado.",
			gymName: "Academia Força Total",
		})

		expect(notification.gymName).toBe("Academia Força Total")
	})
})

describe("Notification.markAsRead()", () => {
	test("should mark notification as read", () => {
		const notification = Notification.create({
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Check-in aprovado",
			message: "Aprovado",
		})

		expect(notification.isRead).toBe(false)
		notification.markAsRead()
		expect(notification.isRead).toBe(true)
		expect(notification.readAt).toBeInstanceOf(Date)
		expect(notification.updatedAt).toBeInstanceOf(Date)
	})

	test("should be idempotent when marking already-read notification", () => {
		const notification = Notification.create({
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Check-in aprovado",
			message: "Aprovado",
		})

		notification.markAsRead()
		const firstReadAt = notification.readAt
		const firstUpdatedAt = notification.updatedAt

		notification.markAsRead()
		expect(notification.readAt).toEqual(firstReadAt)
		expect(notification.updatedAt).toEqual(firstUpdatedAt)
	})
})

describe("Notification.restore()", () => {
	test("should restore a notification with all fields", () => {
		const readAt = new Date("2025-01-01T10:00:00Z")
		const createdAt = new Date("2025-01-01T09:00:00Z")
		const updatedAt = new Date("2025-01-01T10:00:00Z")

		const notification = Notification.restore({
			id: "notif-1",
			userId: "user-1",
			type: "SECURITY_ALERT",
			title: "Alerta de segurança",
			message: "Login de novo dispositivo.",
			readAt,
			deletedAt: undefined,
			createdAt,
			updatedAt,
		})

		expect(notification.id).toBe("notif-1")
		expect(notification.type).toBe("SECURITY_ALERT")
		expect(notification.readAt).toEqual(readAt)
		expect(notification.isRead).toBe(true)
		expect(notification.createdAt).toEqual(createdAt)
	})
})

describe("NotificationNotFoundError", () => {
	test("should be an instance of Error", () => {
		const error = new NotificationNotFoundError()
		expect(error).toBeInstanceOf(Error)
		expect(error.message).toBe("Notification not found")
		expect(error.name).toBe("NotificationNotFoundError")
	})
})
