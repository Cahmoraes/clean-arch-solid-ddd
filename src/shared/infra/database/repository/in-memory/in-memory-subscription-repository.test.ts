import { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { Subscription } from "@/subscription/domain/subscription"

function makeSubscription(
	overrides?: Partial<Parameters<typeof Subscription.create>[0]>,
): Subscription {
	return Subscription.create({
		id: "sub-id-1",
		userId: "user-id-1",
		billingSubscriptionId: "stripe-sub-1",
		customerId: "cus-1",
		status: "active",
		...overrides,
	})
}

describe("InMemorySubscriptionRepository", () => {
	let sut: InMemorySubscriptionRepository

	beforeEach(() => {
		sut = new InMemorySubscriptionRepository()
	})

	describe("ofBillingSubscriptionId", () => {
		it("deve retornar a assinatura pelo billingSubscriptionId correto", async () => {
			const subscription = makeSubscription({
				billingSubscriptionId: "stripe-sub-abc",
			})
			await sut.save(subscription)

			const result = await sut.ofBillingSubscriptionId("stripe-sub-abc")

			expect(result).not.toBeNull()
			expect(result?.billingSubscriptionId).toBe("stripe-sub-abc")
		})

		it("deve retornar null quando billingSubscriptionId não existe", async () => {
			const result = await sut.ofBillingSubscriptionId("non-existent")

			expect(result).toBeNull()
		})

		it("deve retornar null quando a coleção está vazia", async () => {
			const result = await sut.ofBillingSubscriptionId("any-id")

			expect(result).toBeNull()
		})
	})

	describe("ofCustomerId", () => {
		it("deve retornar a assinatura pelo customerId correto", async () => {
			const subscription = makeSubscription({ customerId: "cus-xyz" })
			await sut.save(subscription)

			const result = await sut.ofCustomerId("cus-xyz")

			expect(result).not.toBeNull()
			expect(result?.customerId).toBe("cus-xyz")
		})

		it("deve retornar null quando customerId não existe", async () => {
			const result = await sut.ofCustomerId("non-existent")

			expect(result).toBeNull()
		})

		it("deve retornar a assinatura correta quando há múltiplas assinaturas", async () => {
			const subscription1 = makeSubscription({
				id: "sub-1",
				customerId: "cus-aaa",
				billingSubscriptionId: "stripe-1",
			})
			const subscription2 = makeSubscription({
				id: "sub-2",
				customerId: "cus-bbb",
				billingSubscriptionId: "stripe-2",
			})
			await sut.save(subscription1)
			await sut.save(subscription2)

			const result = await sut.ofCustomerId("cus-bbb")

			expect(result).not.toBeNull()
			expect(result?.customerId).toBe("cus-bbb")
			expect(result?.id).toBe("sub-2")
		})
	})

	describe("withTransaction", () => {
		it("deve retornar a própria instância ao chamar withTransaction", () => {
			const tx = {}
			const result = sut.withTransaction(tx)

			expect(result).toBe(sut)
		})
	})
})
