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

function createDeterministicUuid(index: number) {
	return `00000000-0000-0000-0000-${index.toString(16).padStart(12, "0")}`
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

		const result = await sut.findActivityPage(userId, 1, 20)

		expect(result.items).toHaveLength(2)
		expect(result.items[0].type).toBe("CHECK_IN")
		expect(result.items[0].description).toBe("Check-in — Academia Central")
		expect(result.items[1].type).toBe("LOGIN")
		expect(result.pagination).toEqual({
			page: 1,
			pageSize: 20,
			total: 2,
			totalPages: 1,
		})
	})

	it("deve retornar a segunda página com 21 atividades", async () => {
		const now = Date.now()
		await Promise.all(
			Array.from({ length: 21 }, (_, index) =>
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

		const result = await sut.findActivityPage(userId, 2, 20)

		expect(result.items).toHaveLength(1)
		expect(result.pagination).toEqual({
			page: 2,
			pageSize: 20,
			total: 21,
			totalPages: 2,
		})
	})

	it("deve retornar página intermediária completa em resultado com múltiplas páginas", async () => {
		const now = Date.now()
		await Promise.all(
			Array.from({ length: 45 }, (_, index) =>
				prismaClient.userActivityEvent.create({
					data: {
						id: createDeterministicUuid(index),
						userId,
						type: "LOGIN",
						description: `Login ${index}`,
						occurredAt: new Date(now - index * 1000),
					},
				}),
			),
		)

		const result = await sut.findActivityPage(userId, 2, 20)

		expect(result.items).toEqual(
			Array.from({ length: 20 }, (_, index) => ({
				id: createDeterministicUuid(index + 20),
				type: "LOGIN",
				description: `Login ${index + 20}`,
				occurredAt: new Date(now - (index + 20) * 1000),
			})),
		)
		expect(result.pagination).toEqual({
			page: 2,
			pageSize: 20,
			total: 45,
			totalPages: 3,
		})
	})

	it("deve retornar página final com itens restantes em resultado com múltiplas páginas", async () => {
		const now = Date.now()
		await Promise.all(
			Array.from({ length: 45 }, (_, index) =>
				prismaClient.userActivityEvent.create({
					data: {
						id: createDeterministicUuid(index),
						userId,
						type: "LOGIN",
						description: `Login ${index}`,
						occurredAt: new Date(now - index * 1000),
					},
				}),
			),
		)

		const result = await sut.findActivityPage(userId, 3, 20)

		expect(result.items).toEqual(
			Array.from({ length: 5 }, (_, index) => ({
				id: createDeterministicUuid(index + 40),
				type: "LOGIN",
				description: `Login ${index + 40}`,
				occurredAt: new Date(now - (index + 40) * 1000),
			})),
		)
		expect(result.pagination).toEqual({
			page: 3,
			pageSize: 20,
			total: 45,
			totalPages: 3,
		})
	})

	it("deve retornar página além do total vazia com metadados consistentes", async () => {
		const now = Date.now()
		await Promise.all(
			Array.from({ length: 21 }, (_, index) =>
				prismaClient.userActivityEvent.create({
					data: {
						userId,
						type: "LOGIN",
						description: `Login ${index}`,
						occurredAt: new Date(now - index * 1000),
					},
				}),
			),
		)

		const result = await sut.findActivityPage(userId, 3, 20)

		expect(result).toEqual({
			items: [],
			pagination: {
				page: 3,
				pageSize: 20,
				total: 21,
				totalPages: 2,
			},
		})
	})

	it("deve aplicar offset após merge global entre UserActivityEvent e CheckIn", async () => {
		const base = new Date("2025-06-30T12:00:00.000Z").getTime()
		const dayInMilliseconds = 86_400_000
		await Promise.all([
			...Array.from({ length: 15 }, (_, index) =>
				prismaClient.userActivityEvent.create({
					data: {
						id: createDeterministicUuid(index + 100),
						userId,
						type: "LOGIN",
						description: `Login ${index}`,
						occurredAt: new Date(base - index * dayInMilliseconds - 1000),
					},
				}),
			),
			...Array.from({ length: 15 }, (_, index) =>
				prismaClient.checkIn.create({
					data: {
						id: createDeterministicUuid(index + 200),
						user_id: userId,
						gym_id: gymId,
						latitude: 0,
						longitude: 0,
						created_at: new Date(base - index * dayInMilliseconds),
					},
				}),
			),
		])

		const result = await sut.findActivityPage(userId, 2, 20)

		expect(result.items).toEqual(
			Array.from({ length: 5 }, (_, index) => [
				{
					id: createDeterministicUuid(index + 210),
					type: "CHECK_IN",
					description: "Check-in — Academia Central",
					occurredAt: new Date(base - (index + 10) * dayInMilliseconds),
				},
				{
					id: createDeterministicUuid(index + 110),
					type: "LOGIN",
					description: `Login ${index + 10}`,
					occurredAt: new Date(base - (index + 10) * dayInMilliseconds - 1000),
				},
			]).flat(),
		)
		expect(result.pagination).toEqual({
			page: 2,
			pageSize: 20,
			total: 30,
			totalPages: 2,
		})
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

		const result = await sut.findActivityPage(userId, 1, 20)

		expect(result.items).toHaveLength(20)
		expect(result.pagination.total).toBe(25)
		expect(result.pagination.totalPages).toBe(2)
	})

	it("deve desempatar timestamps iguais por id entre as fontes", async () => {
		const occurredAt = new Date("2025-06-30T12:00:00.000Z")
		await prismaClient.userActivityEvent.create({
			data: {
				id: "00000000-0000-0000-0000-00000000000a",
				userId,
				type: "LOGIN",
				description: "Login A",
				occurredAt,
			},
		})
		await prismaClient.checkIn.create({
			data: {
				id: "00000000-0000-0000-0000-00000000000c",
				user_id: userId,
				gym_id: gymId,
				latitude: 0,
				longitude: 0,
				created_at: occurredAt,
			},
		})

		const result = await sut.findActivityPage(userId, 1, 20)

		expect(result.items.map((item) => item.id)).toEqual([
			"00000000-0000-0000-0000-00000000000c",
			"00000000-0000-0000-0000-00000000000a",
		])
	})
})
