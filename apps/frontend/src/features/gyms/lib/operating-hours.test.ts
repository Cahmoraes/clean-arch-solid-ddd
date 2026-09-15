import { describe, expect, test } from "vitest"
import { isOpenAt, toCompactString } from "./operating-hours"

describe("toCompactString", () => {
	test("deve retornar string vazia para null, undefined e array vazio", () => {
		expect(toCompactString(null)).toBe("")
		expect(toCompactString(undefined)).toBe("")
		expect(toCompactString([])).toBe("")
	})

	test("deve agrupar Seg–Sex mesmo horário e Dom fechado", () => {
		const hours = [
			{ weekday: 1, intervals: [{ open: "08:00", close: "18:00" }] },
			{ weekday: 2, intervals: [{ open: "08:00", close: "18:00" }] },
			{ weekday: 3, intervals: [{ open: "08:00", close: "18:00" }] },
			{ weekday: 4, intervals: [{ open: "08:00", close: "18:00" }] },
			{ weekday: 5, intervals: [{ open: "08:00", close: "18:00" }] },
		]
		const result = toCompactString(hours)
		// Dom (0) e Sáb (6) fechados, Seg–Sex agrupados
		expect(result).toContain("Dom fechado")
		expect(result).toContain("Seg–Sex 08:00–18:00")
		expect(result).toContain("Sáb fechado")
	})

	test("deve agrupar intervalos múltiplos e dias fechados intercalados", () => {
		const hours = [
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "14:00", close: "18:00" },
				],
			},
			{ weekday: 3, intervals: [{ open: "08:00", close: "12:00" }] },
		]
		const result = toCompactString(hours)
		expect(result).toContain("Seg 08:00–12:00, 14:00–18:00")
		expect(result).toContain("Qua 08:00–12:00")
	})
})

describe("isOpenAt", () => {
	// São Paulo UTC-3: 11:00 UTC = 08:00 SP, 15:00 UTC = 12:00 SP
	const mondayHours = [
		{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
	]

	test("deve retornar true na borda inclusive open 08:00", () => {
		// 2026-01-05 é segunda (2026-01-05T11:00:00Z = 08:00 em SP)
		const date = new Date(Date.UTC(2026, 0, 5, 11, 0, 0))
		expect(isOpenAt(mondayHours, date, "America/Sao_Paulo")).toBe(true)
	})

	test("deve retornar false na borda exclusive close 12:00", () => {
		// 12:00 SP = 15:00 UTC
		const date = new Date(Date.UTC(2026, 0, 5, 15, 0, 0))
		expect(isOpenAt(mondayHours, date, "America/Sao_Paulo")).toBe(false)
	})

	test("deve lidar com múltiplos intervalos", () => {
		const hours = [
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "14:00", close: "18:00" },
				],
			},
		]
		// 13:00 SP = 16:00 UTC -> fechado entre intervalos
		expect(
			isOpenAt(
				hours,
				new Date(Date.UTC(2026, 0, 5, 16, 0, 0)),
				"America/Sao_Paulo",
			),
		).toBe(false)
		// 14:00 SP = 17:00 UTC -> aberto segundo intervalo
		expect(
			isOpenAt(
				hours,
				new Date(Date.UTC(2026, 0, 5, 17, 0, 0)),
				"America/Sao_Paulo",
			),
		).toBe(true)
	})

	test("deve retornar false para dia sem schedule", () => {
		// terça 2026-01-06 10:00 SP = 13:00 UTC, mas só segunda tem horário
		const date = new Date(Date.UTC(2026, 0, 6, 13, 0, 0))
		expect(isOpenAt(mondayHours, date, "America/Sao_Paulo")).toBe(false)
	})

	test("deve retornar false para timezone inválido sem lançar", () => {
		const date = new Date(Date.UTC(2026, 0, 5, 11, 0, 0))
		expect(() => isOpenAt(mondayHours, date, "Invalid/Timezone")).not.toThrow()
		expect(isOpenAt(mondayHours, date, "Invalid/Timezone")).toBe(false)
	})

	test("deve retornar false para null/undefined/empty", () => {
		const date = new Date(Date.UTC(2026, 0, 5, 11, 0, 0))
		expect(isOpenAt(null, date)).toBe(false)
		expect(isOpenAt(undefined, date)).toBe(false)
		expect(isOpenAt([], date)).toBe(false)
	})
})
