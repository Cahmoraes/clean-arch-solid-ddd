import { randomUUID } from "node:crypto"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"
import { PrismaPlanRepository } from "@/shared/infra/database/repository/prisma/prisma-plan-repository"
import { PrismaSubscriptionRepository } from "@/shared/infra/database/repository/prisma/prisma-subscription-repository"
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
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

	describe("vínculo com plano e período", () => {
		const planIds: string[] = []

		async function createTestPlan(stripePriceId?: string) {
			const id = randomUUID()
			await prismaClient.plan.create({
				data: {
					id,
					name: "Plano teste",
					price_cents: 4990,
					billing_period: "monthly",
					tagline: "tagline",
					features: [],
					stripe_price_id: stripePriceId ?? `price_${id}`,
				},
			})
			planIds.push(id)
			return id
		}

		function makeActive(
			overrides: { planId?: string; status?: "active" | "canceled" } = {},
		) {
			return Subscription.create({
				id: randomUUID(),
				userId,
				billingSubscriptionId: `stripe-sub-${randomUUID()}`,
				customerId: `cus-${randomUUID()}`,
				status: overrides.status ?? "active",
				planId: overrides.planId,
				billingPeriod: "monthly",
				currentPeriodStart: new Date("2026-01-31T10:00:00.000Z"),
			})
		}

		afterEach(async () => {
			await prismaClient.subscription.deleteMany({ where: { user_id: userId } })
			await prismaClient.plan.deleteMany({ where: { id: { in: planIds } } })
			planIds.length = 0
		})

		it("grava e restaura planId, período e cancelAtPeriodEnd", async () => {
			const planId = await createTestPlan()
			const subscription = makeActive({ planId })
			await sut.save(subscription)

			const restored = await sut.ofBillingSubscriptionId(
				subscription.billingSubscriptionId,
			)

			expect(restored?.planId).toBe(planId)
			expect(restored?.currentPeriodStart.toISOString()).toBe(
				"2026-01-31T10:00:00.000Z",
			)
			expect(restored?.currentPeriodEnd.toISOString()).toBe(
				"2026-02-28T10:00:00.000Z",
			)
			expect(restored?.cancelAtPeriodEnd).toBe(false)
		})

		it("update persiste troca de plano e cancelamento agendado", async () => {
			const firstPlanId = await createTestPlan()
			const secondPlanId = await createTestPlan()
			const subscription = makeActive({ planId: firstPlanId })
			await sut.save(subscription)

			subscription.changePlan(secondPlanId)
			subscription.scheduleCancellation()
			await sut.update(subscription)

			const restored = await sut.ofBillingSubscriptionId(
				subscription.billingSubscriptionId,
			)
			expect(restored?.planId).toBe(secondPlanId)
			expect(restored?.cancelAtPeriodEnd).toBe(true)
		})

		it("aceita linha legada sem plano (plan_id nulo) e a restaura com planId indefinido", async () => {
			const subscription = makeActive()
			await sut.save(subscription)

			const restored = await sut.ofBillingSubscriptionId(
				subscription.billingSubscriptionId,
			)

			expect(restored).not.toBeNull()
			expect(restored?.planId).toBeUndefined()
		})

		it("ofUserId devolve a assinatura ativa e ignora a cancelada", async () => {
			await sut.save(makeActive({ status: "canceled" }))
			const active = makeActive()
			await sut.save(active)

			const result = await sut.ofUserId(userId)

			expect(result?.id).toBe(active.id)
			expect(await sut.ofUserId(randomUUID())).toBeNull()
		})

		it("o índice parcial aceita uma ativa e uma cancelada do mesmo usuário", async () => {
			await sut.save(makeActive({ status: "canceled" }))

			await expect(sut.save(makeActive())).resolves.toBeUndefined()
		})

		it("o índice parcial rejeita a segunda assinatura ativa do mesmo usuário", async () => {
			await sut.save(makeActive())

			await expect(sut.save(makeActive())).rejects.toBeInstanceOf(
				ActiveSubscriptionAlreadyExistsError,
			)
		})

		it("planOfStripePriceId encontra o plano pelo price e devolve null para vazio", async () => {
			const stripePriceId = `price_${randomUUID()}`
			const planId = await createTestPlan(stripePriceId)
			const planRepository = new PrismaPlanRepository(prismaClient)

			const found = await planRepository.planOfStripePriceId(stripePriceId)

			expect(found?.id).toBe(planId)
			expect(await planRepository.planOfStripePriceId("")).toBeNull()
		})

		it("duas criações concorrentes do mesmo usuário: uma vence, a outra falha com conflito, nunca duas ativas", async () => {
			const results = await Promise.allSettled([
				sut.save(makeActive()),
				sut.save(makeActive()),
			])

			const fulfilled = results.filter((r) => r.status === "fulfilled")
			const rejected = results.filter(
				(r): r is PromiseRejectedResult => r.status === "rejected",
			)
			expect(fulfilled).toHaveLength(1)
			expect(rejected).toHaveLength(1)
			expect(rejected[0].reason).toBeInstanceOf(
				ActiveSubscriptionAlreadyExistsError,
			)
			expect(
				await prismaClient.subscription.count({
					where: { user_id: userId, status: "active" },
				}),
			).toBe(1)
		})
	})
})
