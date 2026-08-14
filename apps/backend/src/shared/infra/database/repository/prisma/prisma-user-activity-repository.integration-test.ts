import { randomUUID } from "node:crypto"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"
import { PrismaUserActivityRepository } from "@/shared/infra/database/repository/prisma/prisma-user-activity-repository"

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

describe("PrismaUserActivityRepository", () => {
	let sut: PrismaUserActivityRepository
	let userId: string

	beforeEach(async () => {
		sut = new PrismaUserActivityRepository(prismaClient)
		userId = await createTestUser()
	})

	afterEach(async () => {
		await prismaClient.userActivityEvent.deleteMany({ where: { userId } })
		await prismaClient.user.delete({ where: { id: userId } })
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	it("deve gravar um evento de atividade com metadata", async () => {
		const occurredAt = new Date()

		await sut.record({
			userId,
			type: "ROLE_CHANGED",
			description: "Role alterada para Administrador",
			metadata: { previousRole: "MEMBER", newRole: "ADMIN" },
			occurredAt,
		})

		const saved = await prismaClient.userActivityEvent.findFirst({
			where: { userId },
		})
		expect(saved).not.toBeNull()
		expect(saved?.type).toBe("ROLE_CHANGED")
		expect(saved?.description).toBe("Role alterada para Administrador")
		expect(saved?.metadata).toEqual({
			previousRole: "MEMBER",
			newRole: "ADMIN",
		})
	})

	it("deve gravar um evento de atividade sem metadata", async () => {
		await sut.record({
			userId,
			type: "LOGIN",
			description: "Login realizado",
			occurredAt: new Date(),
		})

		const saved = await prismaClient.userActivityEvent.findFirst({
			where: { userId },
		})
		expect(saved).not.toBeNull()
		expect(saved?.type).toBe("LOGIN")
		expect(saved?.metadata).toBeNull()
	})
})
