import { beforeEach, describe, expect, test } from "vitest"
import { Notification } from "@/notification/domain/notification.js"
import { InMemoryNotificationRepository } from "./in-memory-notification.repository.js"

function makeNotification(userId: string, id?: string) {
	return Notification.create({
		id,
		userId,
		type: "PROMOTION",
		title: "Titulo",
		message: "Mensagem",
	})
}

describe("InMemoryNotificationRepository.saveMany", () => {
	let sut: InMemoryNotificationRepository

	beforeEach(() => {
		sut = new InMemoryNotificationRepository()
	})

	test("persiste todas as notificacoes do lote", async () => {
		const batch = [
			makeNotification("user-1"),
			makeNotification("user-2"),
			makeNotification("user-3"),
		]
		await sut.saveMany(batch)
		expect(sut.notifications.size).toBe(3)
		for (const notification of batch) {
			expect(await sut.findById(notification.id)).toBe(notification)
		}
	})

	test("substitui uma notificacao existente com o mesmo id", async () => {
		const original = makeNotification("user-1", "notif-1")
		const replacement = makeNotification("user-1", "notif-1")
		await sut.save(original)
		await sut.saveMany([replacement])
		expect(sut.notifications.size).toBe(1)
		expect(await sut.findById("notif-1")).toBe(replacement)
	})

	test("lote vazio nao altera o repositorio", async () => {
		await sut.saveMany([])
		expect(sut.notifications.size).toBe(0)
	})
})
