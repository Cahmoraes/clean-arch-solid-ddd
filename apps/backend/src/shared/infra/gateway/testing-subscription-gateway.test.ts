import { describe, expect, it } from "vitest"
import { TestingSubscriptionGateway } from "./testing-subscription-gateway"

describe("TestingSubscriptionGateway.changeSubscriptionPrice", () => {
	it("registra a troca de price em changedPrices", async () => {
		const sut = new TestingSubscriptionGateway()

		await sut.changeSubscriptionPrice({
			billingSubscriptionId: "sub_test_1",
			priceId: "price_yearly",
		})

		expect(sut.changedPrices).toEqual([
			{ billingSubscriptionId: "sub_test_1", priceId: "price_yearly" },
		])
	})

	it("lança o erro configurado por failPriceChangeWith e não registra a troca", async () => {
		const sut = new TestingSubscriptionGateway()
		const error = new Error("stripe indisponível")
		sut.failPriceChangeWith(error)

		await expect(
			sut.changeSubscriptionPrice({
				billingSubscriptionId: "sub_test_1",
				priceId: "price_yearly",
			}),
		).rejects.toBe(error)
		expect(sut.changedPrices).toEqual([])
	})
})
