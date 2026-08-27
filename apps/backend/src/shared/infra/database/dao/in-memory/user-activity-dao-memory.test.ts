import { InMemoryUserActivityDao } from "./user-activity-dao-memory.js"

describe("InMemoryUserActivityDao", () => {
	test("findActivityPage ordena itens por occurredAt decrescente", async () => {
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

		const result = await dao.findActivityPage("user-1", 1, 20)

		expect(result.items.map((item) => item.id)).toEqual([
			"neg5",
			"neg3",
			"neg1",
		])
		expect(result.pagination).toEqual({
			page: 1,
			pageSize: 20,
			total: 3,
			totalPages: 1,
		})
	})

	test("findActivityPage retorna segunda página e total para 25 itens", async () => {
		const base = new Date("2025-01-25T00:00:00.000Z").getTime()
		const dao = new InMemoryUserActivityDao(
			Array.from({ length: 25 }, (_, index) => ({
				id: `item-${index}`,
				type: "LOGIN",
				description: "Login realizado",
				occurredAt: new Date(base - index * 86_400_000),
			})),
		)

		const result = await dao.findActivityPage("user-1", 2, 20)

		expect(result.items).toHaveLength(5)
		expect(result.items[0].id).toBe("item-20")
		expect(result.items[4].id).toBe("item-24")
		expect(result.pagination).toEqual({
			page: 2,
			pageSize: 20,
			total: 25,
			totalPages: 2,
		})
	})

	test("findActivityPage aplica desempate determinístico por id", async () => {
		const occurredAt = new Date("2025-01-01T00:00:00.000Z")
		const dao = new InMemoryUserActivityDao([
			{
				id: "activity-a",
				type: "LOGIN",
				description: "Login A",
				occurredAt,
			},
			{
				id: "activity-c",
				type: "CHECK_IN",
				description: "Check-in C",
				occurredAt,
			},
			{
				id: "activity-b",
				type: "PASSWORD_CHANGED",
				description: "Senha B",
				occurredAt,
			},
		])

		const result = await dao.findActivityPage("user-1", 1, 2)

		expect(result.items.map((item) => item.id)).toEqual([
			"activity-c",
			"activity-b",
		])
		expect(result.pagination.total).toBe(3)
		expect(result.pagination.totalPages).toBe(2)
	})

	test("findActivityPage retorna página vazia com metadados consistentes", async () => {
		const dao = new InMemoryUserActivityDao([])

		const result = await dao.findActivityPage("user-1", 2, 20)

		expect(result.items).toEqual([])
		expect(result.pagination).toEqual({
			page: 2,
			pageSize: 20,
			total: 0,
			totalPages: 0,
		})
	})

	test("findActivityPage cobre páginas inicial, intermediária e final", async () => {
		const base = new Date("2025-02-14T00:00:00.000Z").getTime()
		const dao = new InMemoryUserActivityDao(
			Array.from({ length: 45 }, (_, index) => ({
				id: `item-${index}`,
				type: "LOGIN" as const,
				description: "Login realizado",
				occurredAt: new Date(base - index * 86_400_000),
			})),
		)

		const firstPage = await dao.findActivityPage("user-1", 1, 20)
		const middlePage = await dao.findActivityPage("user-1", 2, 20)
		const lastPage = await dao.findActivityPage("user-1", 3, 20)
		const emptyPage = await dao.findActivityPage("user-1", 4, 20)

		expect(firstPage.items).toHaveLength(20)
		expect(firstPage.items[0].id).toBe("item-0")
		expect(middlePage.items[0].id).toBe("item-20")
		expect(middlePage.items).toHaveLength(20)
		expect(lastPage.items.map((item) => item.id)).toEqual([
			"item-40",
			"item-41",
			"item-42",
			"item-43",
			"item-44",
		])
		expect(emptyPage.items).toEqual([])
		expect(emptyPage.pagination).toEqual({
			page: 4,
			pageSize: 20,
			total: 45,
			totalPages: 3,
		})
	})
})
