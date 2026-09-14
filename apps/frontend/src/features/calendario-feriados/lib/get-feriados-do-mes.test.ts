import { describe, expect, test } from "vitest"
import { getFeriadosDoMes } from "./get-feriados-do-mes"

describe("getFeriadosDoMes", () => {
	test("filtra por mês", () => {
		const f = [
			{
				date: "2026-09-07",
				name: "Independência",
				type: "national" as const,
				isNational: true,
			},
			{
				date: "2026-10-12",
				name: "Aparecida",
				type: "national" as const,
				isNational: true,
			},
		]
		expect(getFeriadosDoMes(f, 8)).toHaveLength(1)
		expect(getFeriadosDoMes(f, 9)[0].name).toBe("Aparecida")
	})
})
