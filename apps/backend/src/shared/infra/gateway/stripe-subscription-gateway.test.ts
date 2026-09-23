import { beforeEach, describe, expect, it, vi } from "vitest"

const stripeMock = vi.hoisted(() => ({
	subscriptions: {
		retrieve: vi.fn(),
		update: vi.fn(),
	},
}))

vi.mock("stripe", () => ({
	__esModule: true,
	default: vi.fn(function StripeMock() {
		return stripeMock
	}),
}))

// setup-test.ts already imports the IoC container, which statically imports
// StripeSubscriptionGateway (and the real "stripe" SDK) before this file's
// vi.mock is applied. Reset the module registry and re-import so this test's
// mock is the one the gateway actually constructs against.
vi.resetModules()
const { StripeSubscriptionGateway } = await import(
	"./stripe-subscription-gateway"
)

describe("StripeSubscriptionGateway.changeSubscriptionPrice", () => {
	beforeEach(() => {
		stripeMock.subscriptions.retrieve.mockReset()
		stripeMock.subscriptions.update.mockReset()
	})

	it("troca o price do item existente da assinatura sem cobrança proporcional", async () => {
		stripeMock.subscriptions.retrieve.mockResolvedValue({
			id: "sub_1",
			items: { data: [{ id: "si_1" }] },
		})
		stripeMock.subscriptions.update.mockResolvedValue({ id: "sub_1" })
		const sut = new StripeSubscriptionGateway()

		await sut.changeSubscriptionPrice({
			billingSubscriptionId: "sub_1",
			priceId: "price_yearly",
		})

		expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith("sub_1")
		expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_1", {
			items: [{ id: "si_1", price: "price_yearly" }],
			proration_behavior: "none",
		})
	})

	it("propaga o erro do SDK sem engolir", async () => {
		const error = new Error("stripe down")
		stripeMock.subscriptions.retrieve.mockRejectedValue(error)
		const sut = new StripeSubscriptionGateway()

		await expect(
			sut.changeSubscriptionPrice({
				billingSubscriptionId: "sub_1",
				priceId: "price_yearly",
			}),
		).rejects.toBe(error)
		expect(stripeMock.subscriptions.update).not.toHaveBeenCalled()
	})
})
