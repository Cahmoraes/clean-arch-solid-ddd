import { beforeEach, describe, expect, it, vi } from "vitest"
import { StripeSubscriptionGateway } from "./stripe-subscription-gateway"

type MockSubscriptionsResource = {
	retrieve: ReturnType<typeof vi.fn>
	update: ReturnType<typeof vi.fn>
}

type MockStripe = {
	subscriptions: MockSubscriptionsResource
}

describe("StripeSubscriptionGateway.changeSubscriptionPrice", () => {
	let stripeMockInstance: MockStripe

	beforeEach(() => {
		stripeMockInstance = {
			subscriptions: {
				retrieve: vi.fn(),
				update: vi.fn(),
			},
		}
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it("troca o price do item existente da assinatura sem cobrança proporcional", async () => {
		stripeMockInstance.subscriptions.retrieve.mockResolvedValue({
			id: "sub_1",
			items: { data: [{ id: "si_1" }] },
		} as Parameters<
			(typeof stripeMockInstance.subscriptions.retrieve)["mockResolvedValue"]
		>[0])
		stripeMockInstance.subscriptions.update.mockResolvedValue({
			id: "sub_1",
		} as Parameters<
			(typeof stripeMockInstance.subscriptions.update)["mockResolvedValue"]
		>[0])

		const gateway = new StripeSubscriptionGateway()
		;(gateway as unknown as { stripe: MockStripe }).stripe = stripeMockInstance

		await gateway.changeSubscriptionPrice({
			billingSubscriptionId: "sub_1",
			priceId: "price_yearly",
		})

		expect(stripeMockInstance.subscriptions.retrieve).toHaveBeenCalledWith(
			"sub_1",
		)
		expect(stripeMockInstance.subscriptions.update).toHaveBeenCalledWith(
			"sub_1",
			{
				items: [{ id: "si_1", price: "price_yearly" }],
				proration_behavior: "none",
			},
		)
	})

	it("propaga o erro do SDK sem engolir", async () => {
		const error = new Error("stripe down")
		stripeMockInstance.subscriptions.retrieve.mockRejectedValue(error)

		const gateway = new StripeSubscriptionGateway()
		;(gateway as unknown as { stripe: MockStripe }).stripe = stripeMockInstance

		await expect(
			gateway.changeSubscriptionPrice({
				billingSubscriptionId: "sub_1",
				priceId: "price_yearly",
			}),
		).rejects.toBe(error)
		expect(stripeMockInstance.subscriptions.update).not.toHaveBeenCalled()
	})
})
