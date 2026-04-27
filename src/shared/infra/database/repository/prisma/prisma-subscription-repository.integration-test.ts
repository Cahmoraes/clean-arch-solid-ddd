import { randomUUID } from "node:crypto"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"
import { PrismaSubscriptionRepository } from "@/shared/infra/database/repository/prisma/prisma-subscription-repository"
import { Subscription } from "@/subscription/domain/subscription"

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

describe("PrismaSubscriptionRepository", () => {
	let sut: PrismaSubscriptionRepository
	let userId: string

	beforeEach(async () => {
		sut = new PrismaSubscriptionRepository(prismaClient)
		userId = await createTestUser()
	})

	afterEach(async () => {
		await prismaClient.subscription.deleteMany({ where: { user_id: userId } })
		await prismaClient.user.delete({ where: { id: userId } })
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	describe("ofBillingSubscriptionId", () => {
		it("deve localizar assinatura pelo billingSubscriptionId correto", async () => {
			const billingId = `stripe-sub-${randomUUID()}`
			const subscription = Subscription.create({
				id: randomUUID(),
				userId,
				billingSubscriptionId: billingId,
				customerId: `cus-${randomUUID()}`,
				status: "active",
			})
			await sut.save(subscription)

			const result = await sut.ofBillingSubscriptionId(billingId)

			expect(result).not.toBeNull()
			expect(result?.billingSubscriptionId).toBe(billingId)
			expect(result?.userId).toBe(userId)
		})

		it("deve retornar null para billingSubscriptionId inexistente", async () => {
			const result = await sut.ofBillingSubscriptionId("non-existent-id")

			expect(result).toBeNull()
		})
	})

	describe("ofCustomerId", () => {
		it("deve localizar assinatura pelo customerId correto", async () => {
			const customerId = `cus-${randomUUID()}`
			const subscription = Subscription.create({
				id: randomUUID(),
				userId,
				billingSubscriptionId: `stripe-sub-${randomUUID()}`,
				customerId,
				status: "active",
			})
			await sut.save(subscription)

			const result = await sut.ofCustomerId(customerId)

			expect(result).not.toBeNull()
			expect(result?.customerId).toBe(customerId)
			expect(result?.userId).toBe(userId)
		})

		it("deve retornar null para customerId inexistente", async () => {
			const result = await sut.ofCustomerId("non-existent-customer")

			expect(result).toBeNull()
		})
	})
})
