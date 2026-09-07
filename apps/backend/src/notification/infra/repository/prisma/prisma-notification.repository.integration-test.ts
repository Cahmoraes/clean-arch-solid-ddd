import { randomUUID } from "node:crypto"
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

async function saveNotification(
	sut: PrismaNotificationRepository,
	userId: string,
	title: string,
	createdAt: Date,
) {
	const notification = Notification.create({
		id: randomUUID(),
		userId,
		type: "CHECK_IN_APPROVED",
		title,
		message: "message",
	})
	await sut.save(notification)
	// createdAt determinístico: evita empates de timestamp entre inserções
	// próximas, garantindo ordenação previsível para o teste.
	await prismaClient.notification.update({
		where: { id: notification.id },
		data: { createdAt },
	})
	return notification
}

describe("PrismaNotificationRepository", () => {
	let sut: PrismaNotificationRepository
	let userId: string

	beforeEach(async () => {
		sut = new PrismaNotificationRepository(prismaClient)
		userId = await createTestUser()
	})

	afterEach(async () => {
		await prismaClient.userNotification.deleteMany({ where: { userId } })
		await prismaClient.notification.deleteMany({ where: { userId } })
		await prismaClient.user.delete({ where: { id: userId } })
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	describe("findManyByUserId", () => {
		it("deve aplicar skip/take corretos quando offset e limit são informados", async () => {
			const base = new Date("2026-01-01T00:00:00.000Z").getTime()
			const saved: Notification[] = []
			for (let i = 0; i < 15; i++) {
				saved.push(
					await saveNotification(
						sut,
						userId,
						`notification-${i}`,
						new Date(base + i * 1000),
					),
				)
			}

			const result = await sut.findManyByUserId({
				userId,
				page: 1,
				offset: 10,
				limit: 5,
			})

			expect(result.total).toBe(15)
			expect(result.items).toHaveLength(5)
			const expectedIds = saved
				.slice()
				.reverse()
				.slice(10, 15)
				.map((notification) => notification.id)
			expect(result.items.map((notification) => notification.id)).toEqual(
				expectedIds,
			)
		})

		it("deve usar paginação por página quando offset/limit estão ausentes", async () => {
			const base = new Date("2026-02-01T00:00:00.000Z").getTime()
			const saved: Notification[] = []
			for (let i = 0; i < 3; i++) {
				saved.push(
					await saveNotification(
						sut,
						userId,
						`notification-${i}`,
						new Date(base + i * 1000),
					),
				)
			}

			const result = await sut.findManyByUserId({
				userId,
				page: 1,
			})

			expect(result.total).toBe(3)
			expect(result.items).toHaveLength(3)
			const expectedIds = saved
				.slice()
				.reverse()
				.map((notification) => notification.id)
			expect(result.items.map((notification) => notification.id)).toEqual(
				expectedIds,
			)
		})
	})
})
