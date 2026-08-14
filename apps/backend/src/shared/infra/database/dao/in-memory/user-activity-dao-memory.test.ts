import { InMemoryUserActivityDao } from "./user-activity-dao-memory.js"

describe("InMemoryUserActivityDao", () => {
	test("findRecentActivity ordena itens por occurredAt decrescente", async () => {
		const dao = new InMemoryUserActivityDao([
			{
				id: "neg5",
				type: "LOGIN",
				description: "Login realizado",
				occurredAt: new Date("2025-01-05T00:00:00.000Z"),
			},
			{
				id: "neg1",
				type: "CHECK_IN",
				description: "Check-in — Academia Central",
				occurredAt: new Date("2025-01-01T00:00:00.000Z"),
			},
			{
				id: "neg3",
				type: "PASSWORD_CHANGED",
				description: "Senha alterada",
				occurredAt: new Date("2025-01-03T00:00:00.000Z"),
			},
		])

		const result = await dao.findRecentActivity("user-1", 20)

		expect(result.map((item) => item.id)).toEqual(["neg5", "neg3", "neg1"])
	})

	test("findRecentActivity trunca o resultado ao limite pedido", async () => {
		const base = new Date("2025-01-25T00:00:00.000Z").getTime()
		const dao = new InMemoryUserActivityDao(
			Array.from({ length: 25 }, (_, index) => ({
				id: `item-${index}`,
				type: "LOGIN",
				description: "Login realizado",
				occurredAt: new Date(base - index * 86_400_000),
			})),
		)

		const result = await dao.findRecentActivity("user-1", 20)

		expect(result).toHaveLength(20)
		expect(result[0].id).toBe("item-0")
		expect(result[19].id).toBe("item-19")
	})
})
