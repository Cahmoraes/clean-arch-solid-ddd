import { describe, expect, test } from "vitest"
import { agruparFeriadosPorSemana, getSemanaDoMes } from "./get-semana-do-mes"

describe("getSemanaDoMes", () => {
	test("primeiro dia do mês (setembro/2026, mês que começa numa terça) retorna semana 1", () => {
		expect(getSemanaDoMes("2026-09-01")).toBe(1)
	})

	test("dia perto do fim do mês cai em semana avançada", () => {
		expect(getSemanaDoMes("2026-09-30")).toBe(5)
	})
})

describe("agruparFeriadosPorSemana", () => {
	test("agrupa feriados por semana e ordena os grupos por número da semana", () => {
		const feriados = [
			{
				date: "2026-09-21",
				name: "Feriado B",
				type: "national" as const,
				isNational: true,
			},
			{
				date: "2026-09-07",
				name: "Feriado A",
				type: "national" as const,
				isNational: true,
			},
		]

		const grupos = agruparFeriadosPorSemana(feriados)

		expect(grupos.map((g) => g.semana)).toEqual([2, 4])
		expect(grupos[0].feriados[0].name).toBe("Feriado A")
		expect(grupos[1].feriados[0].name).toBe("Feriado B")
	})
})
