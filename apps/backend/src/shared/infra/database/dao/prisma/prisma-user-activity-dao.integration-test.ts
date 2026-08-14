import { randomUUID } from "node:crypto"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"
import { PrismaUserActivityDao } from "@/shared/infra/database/dao/prisma/prisma-user-activity-dao"

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

async function createTestGym() {
	const gymId = randomUUID()
	await prismaClient.gym.create({
		data: {
			id: gymId,
			cnpj: `cnpj-${gymId}`,
			title: "Academia Central",
			latitude: 0,
			longitude: 0,
		},
	})
	return gymId
}

describe("PrismaUserActivityDao", () => {
	let sut: PrismaUserActivityDao
	let userId: string
	let gymId: string

	beforeEach(async () => {
		sut = new PrismaUserActivityDao(prismaClient)
		userId = await createTestUser()
		gymId = await createTestGym()
	})

	afterEach(async () => {
		await prismaClient.checkIn.deleteMany({ where: { user_id: userId } })
		await prismaClient.userActivityEvent.deleteMany({ where: { userId } })
		await prismaClient.gym.delete({ where: { id: gymId } })
		await prismaClient.user.delete({ where: { id: userId } })
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	it("deve mesclar UserActivityEvent e CheckIn ordenados por data decrescente", async () => {
		const now = Date.now()
		await prismaClient.userActivityEvent.create({
			data: {
				userId,
				type: "LOGIN",
				description: "Login realizado",
				occurredAt: new Date(now - 1000),
			},
		})
		await prismaClient.checkIn.create({
			data: {
				user_id: userId,
				gym_id: gymId,
				latitude: 0,
				longitude: 0,
				created_at: new Date(now),
			},
		})

		const result = await sut.findRecentActivity(userId, 20)

		expect(result).toHaveLength(2)
		expect(result[0].type).toBe("CHECK_IN")
		expect(result[0].description).toBe("Check-in — Academia Central")
		expect(result[1].type).toBe("LOGIN")
	})

	it("deve limitar o resultado combinado ao limite pedido", async () => {
		const now = Date.now()
		await Promise.all(
			Array.from({ length: 25 }, (_, index) =>
				prismaClient.userActivityEvent.create({
					data: {
						userId,
						type: "LOGIN",
						description: "Login realizado",
						occurredAt: new Date(now - index * 1000),
					},
				}),
			),
		)

		const result = await sut.findRecentActivity(userId, 20)

		expect(result).toHaveLength(20)
	})

	it("deve aplicar o limite no merge quando ambas as fontes somam mais que o limite", async () => {
		const now = new Date("2025-06-30T12:00:00.000Z").getTime()
		await Promise.all(
			Array.from({ length: 15 }, (_, index) =>
				prismaClient.userActivityEvent.create({
					data: {
						userId,
						type: "LOGIN",
						description: "Login realizado",
						occurredAt: new Date(now - index * 86_400_000),
					},
				}),
			),
		)
		await Promise.all(
			Array.from({ length: 10 }, (_, index) =>
				prismaClient.checkIn.create({
					data: {
						user_id: userId,
						gym_id: gymId,
						latitude: 0,
						longitude: 0,
						created_at: new Date(now + index * 86_400_000),
					},
				}),
			),
		)

		const result = await sut.findRecentActivity(userId, 20)

		expect(result).toHaveLength(20)
	})
})
