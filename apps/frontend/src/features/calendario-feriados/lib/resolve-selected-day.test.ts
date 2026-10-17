import { describe, expect, test } from "vitest"
import { resolveSelectedDay } from "./resolve-selected-day"

const hoje = new Date(2026, 9, 17)

function diaEsperadoSemSelecao(monthIndex: number): string {
	if (monthIndex === 9) return "2026-10-17"
	return `2026-${String(monthIndex + 1).padStart(2, "0")}-01`
}

describe("resolveSelectedDay", () => {
	test("devolve o dia clicado quando ele pertence ao mês exibido", () => {
		expect(
			resolveSelectedDay({
				clicked: "2026-10-12",
				year: 2026,
				monthIndex: 9,
				today: hoje,
			}),
		).toBe("2026-10-12")
	})

	test("clicado em outro mês com o mês atual exibido devolve hoje", () => {
		expect(
			resolveSelectedDay({
				clicked: "2026-09-30",
				year: 2026,
				monthIndex: 9,
				today: hoje,
			}),
		).toBe("2026-10-17")
	})

	test("clicado em outro ano com o mês atual exibido devolve hoje", () => {
		expect(
			resolveSelectedDay({
				clicked: "2025-10-12",
				year: 2026,
				monthIndex: 9,
				today: hoje,
			}),
		).toBe("2026-10-17")
	})

	test("mês exibido sem hoje devolve o dia 1 com zero à esquerda", () => {
		expect(
			resolveSelectedDay({
				clicked: null,
				year: 2026,
				monthIndex: 2,
				today: hoje,
			}),
		).toBe("2026-03-01")
	})

	test("clicado nulo no mês de hoje devolve hoje", () => {
		expect(
			resolveSelectedDay({
				clicked: null,
				year: 2026,
				monthIndex: 9,
				today: hoje,
			}),
		).toBe("2026-10-17")
	})

	test("virada de ano: clicado em janeiro seguinte com dezembro exibido devolve o dia 1", () => {
		expect(
			resolveSelectedDay({
				clicked: "2027-01-05",
				year: 2026,
				monthIndex: 11,
				today: hoje,
			}),
		).toBe("2026-12-01")
	})

	test("mesmo mês em outro ano não conta como pertencente ao mês exibido", () => {
		expect(
			resolveSelectedDay({
				clicked: "2027-10-12",
				year: 2026,
				monthIndex: 9,
				today: hoje,
			}),
		).toBe("2026-10-17")
	})

	test("Review Focus: clicado fora do mês ou mês sem hoje nunca deixa sem dia", () => {
		for (const monthIndex of Array.from({ length: 12 }, (_, i) => i)) {
			for (const clicked of [null, "2025-10-12", "2027-12-01"]) {
				const dia = resolveSelectedDay({
					clicked,
					year: 2026,
					monthIndex,
					today: hoje,
				})
				expect(dia).toMatch(/^\d{4}-\d{2}-\d{2}$/)
				expect(dia).toBe(diaEsperadoSemSelecao(monthIndex))
			}
		}
	})
})
