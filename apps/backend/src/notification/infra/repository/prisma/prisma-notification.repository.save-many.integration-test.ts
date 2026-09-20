import { randomUUID } from "node:crypto"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vitest"
import { Notification } from "@/notification/domain/notification"
import { PrismaNotificationRepository } from "@/notification/infra/repository/prisma/prisma-notification.repository"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"

async function createTestUser() {
	const userId = randomUUID()
	await prismaClient.user.create({
		data: {
			id: userId,
			name: "Test User",
			email: `test-${userId}@example.com`,
			password_hash: "hashed-password",
			role: "MEMBER",
			status: "activated",
		},
	})
	return userId
}

describe("PrismaNotificationRepository.saveMany", () => {
	let sut: PrismaNotificationRepository
	let userIds: string[]

	beforeEach(async () => {
		sut = new PrismaNotificationRepository(prismaClient)
		userIds = [
			await createTestUser(),
			await createTestUser(),
			await createTestUser(),
		]
	})

	afterEach(async () => {
		await prismaClient.userNotification.deleteMany({
			where: { userId: { in: userIds } },
		})
		await prismaClient.notification.deleteMany({
			where: { userId: { in: userIds } },
		})
		await prismaClient.user.deleteMany({ where: { id: { in: userIds } } })
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	test("saveMany persiste N linhas com vinculo em user_notifications", async () => {
		const batch = userIds.map((userId) =>
			Notification.create({
				id: randomUUID(),
				userId,
				type: "PROMOTION",
				title: "Aviso em lote",
				message: "Mensagem em lote",
			}),
		)

		await sut.saveMany(batch)

		expect(
			await prismaClient.notification.count({
				where: { userId: { in: userIds } },
			}),
		).toBe(3)
		expect(
			await prismaClient.userNotification.count({
				where: { userId: { in: userIds } },
			}),
		).toBe(3)
		for (const notification of batch) {
			const row = await prismaClient.notification.findUniqueOrThrow({
				where: { id: notification.id },
				include: { userNotifications: true },
			})
			expect(row.gymName).toBeNull()
			expect(row.reason).toBeNull()
			expect(row.userNotifications).toHaveLength(1)
			expect(row.userNotifications[0]?.userId).toBe(notification.userId)
			expect(row.userNotifications[0]?.readAt).toBeNull()
			expect(row.userNotifications[0]?.deletedAt).toBeNull()
		}
	})

	test("cada usuario le a propria notificacao via findManyByUserId", async () => {
		const batch = userIds.map((userId) =>
			Notification.create({
				id: randomUUID(),
				userId,
				type: "PROMOTION",
				title: "Aviso em lote",
				message: "Mensagem em lote",
			}),
		)
		await sut.saveMany(batch)

		for (const userId of userIds) {
			const result = await sut.findManyByUserId({ userId, page: 1 })
			expect(result.total).toBe(1)
			expect(result.items[0]?.userId).toBe(userId)
			expect(result.items[0]?.readAt).toBeUndefined()
		}
	})

	test("falha na escrita de user_notifications desfaz o insert em notifications", async () => {
		// readAt so e gravado na segunda escrita (user_notifications) e esta fora
		// do intervalo de timestamp do Postgres (limite: 4713 AC), entao a
		// primeira escrita (notifications) ja teve sucesso quando a segunda falha.
		const outOfRangeReadAt = new Date(-300_000_000_000_000)
		const now = new Date()
		const batch = userIds.map((userId, index) =>
			Notification.restore({
				id: randomUUID(),
				userId,
				type: "PROMOTION",
				title: "Aviso em lote",
				message: "Mensagem em lote",
				readAt: index === userIds.length - 1 ? outOfRangeReadAt : undefined,
				createdAt: now,
				updatedAt: now,
			}),
		)
		const batchIds = batch.map((notification) => notification.id)

		await expect(sut.saveMany(batch)).rejects.toThrow()

		expect(
			await prismaClient.notification.count({
				where: { id: { in: batchIds } },
			}),
		).toBe(0)
		expect(
			await prismaClient.userNotification.count({
				where: { notificationId: { in: batchIds } },
			}),
		).toBe(0)
	})

	test("lote vazio nao grava nada", async () => {
		await sut.saveMany([])
		expect(
			await prismaClient.notification.count({
				where: { userId: { in: userIds } },
			}),
		).toBe(0)
	})
})
