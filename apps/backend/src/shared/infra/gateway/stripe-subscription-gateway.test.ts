import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("StripeSubscriptionGateway.changeSubscriptionPrice", () => {
	let stripeMockInstance: ReturnType<typeof createStripeMock>

	beforeEach(() => {
		stripeMockInstance = createStripeMock()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it("troca o price do item existente da assinatura sem cobrança proporcional", async () => {
		stripeMockInstance.subscriptions.retrieve.mockResolvedValue({
			id: "sub_1",
			items: { data: [{ id: "si_1" }] },
		} as any)
		stripeMockInstance.subscriptions.update.mockResolvedValue({
			id: "sub_1",
		} as any)

		const { StripeSubscriptionGateway } = await import(
			"./stripe-subscription-gateway.js"
		)

		// Create a test instance with mocked stripe
		const gateway = new StripeSubscriptionGateway()
		gateway["stripe"] = stripeMockInstance as any

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

		const { StripeSubscriptionGateway } = await import(
			"./stripe-subscription-gateway.js"
		)

		const gateway = new StripeSubscriptionGateway()
		gateway["stripe"] = stripeMockInstance as any

		await expect(
			gateway.changeSubscriptionPrice({
				billingSubscriptionId: "sub_1",
				priceId: "price_yearly",
			}),
		).rejects.toBe(error)
		expect(stripeMockInstance.subscriptions.update).not.toHaveBeenCalled()
	})
})

function createStripeMock() {
	return {
		subscriptions: {
			retrieve: vi.fn(),
			update: vi.fn(),
		},
	}
}
