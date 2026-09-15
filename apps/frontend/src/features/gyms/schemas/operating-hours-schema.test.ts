import { describe, expect, test } from "vitest"
import { operatingHoursSchema } from "./operating-hours-schema"

describe("operatingHoursSchema", () => {
	test("deve aceitar múltiplos intervalos válidos", () => {
		const result = operatingHoursSchema.safeParse([
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "14:00", close: "18:00" },
				],
			},
			{ weekday: 2, intervals: [{ open: "06:00", close: "22:00" }] },
		])
		expect(result.success).toBe(true)
	})

	test("deve aceitar array vazio e undefined (opcional)", () => {
		expect(operatingHoursSchema.safeParse([]).success).toBe(true)
		expect(operatingHoursSchema.safeParse(undefined).success).toBe(true)
	})

	test("deve rejeitar sobreposição intra-dia", () => {
		const result = operatingHoursSchema.safeParse([
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "11:00", close: "14:00" },
				],
			},
		])
		expect(result.success).toBe(false)
	})

	test("deve rejeitar sobreposição mesmo fora de ordem (ordena antes)", () => {
		const result = operatingHoursSchema.safeParse([
			{
				weekday: 3,
				intervals: [
					{ open: "14:00", close: "18:00" },
					{ open: "08:00", close: "12:00" },
					{ open: "11:00", close: "15:00" },
				],
			},
		])
		expect(result.success).toBe(false)
	})

	test("deve rejeitar open >= close (FR-003)", () => {
		const equal = operatingHoursSchema.safeParse([
			{ weekday: 1, intervals: [{ open: "08:00", close: "08:00" }] },
		])
		expect(equal.success).toBe(false)

		const inverted = operatingHoursSchema.safeParse([
			{ weekday: 1, intervals: [{ open: "18:00", close: "08:00" }] },
		])
		expect(inverted.success).toBe(false)
	})

	test("deve rejeitar HH:mm inválido (FR-003)", () => {
		const invalidHour = operatingHoursSchema.safeParse([
			{ weekday: 1, intervals: [{ open: "24:00", close: "12:00" }] },
		])
		expect(invalidHour.success).toBe(false)

		const invalidMinute = operatingHoursSchema.safeParse([
			{ weekday: 1, intervals: [{ open: "08:60", close: "12:00" }] },
		])
		expect(invalidMinute.success).toBe(false)

		const noLeadingZero = operatingHoursSchema.safeParse([
			{ weekday: 1, intervals: [{ open: "8:00", close: "12:00" }] },
		])
		expect(noLeadingZero.success).toBe(false)
	})

	test("deve rejeitar weekday fora de 0-6 (FR-005)", () => {
		const neg = operatingHoursSchema.safeParse([
			{ weekday: -1, intervals: [{ open: "08:00", close: "12:00" }] },
		])
		expect(neg.success).toBe(false)

		const over = operatingHoursSchema.safeParse([
			{ weekday: 7, intervals: [{ open: "08:00", close: "12:00" }] },
		])
		expect(over.success).toBe(false)

		const float = operatingHoursSchema.safeParse([
			{ weekday: 1.5, intervals: [{ open: "08:00", close: "12:00" }] },
		])
		expect(float.success).toBe(false)
	})

	test("deve rejeitar weekday duplicado (FR-005)", () => {
		const result = operatingHoursSchema.safeParse([
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
			{ weekday: 1, intervals: [{ open: "14:00", close: "18:00" }] },
		])
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0].message).toMatch(/weekday duplicado/i)
		}
	})

	test("deve rejeitar mais de 7 dias (FR-005)", () => {
		const days = Array.from({ length: 8 }, (_, i) => ({
			weekday: i % 7,
			intervals: [{ open: "08:00", close: "12:00" }],
		}))
		const result = operatingHoursSchema.safeParse(days)
		expect(result.success).toBe(false)
	})

	test("deve rejeitar mais de 3 intervalos por dia (FR-010)", () => {
		const result = operatingHoursSchema.safeParse([
			{
				weekday: 1,
				intervals: [
					{ open: "06:00", close: "08:00" },
					{ open: "09:00", close: "11:00" },
					{ open: "12:00", close: "14:00" },
					{ open: "15:00", close: "17:00" },
				],
			},
		])
		expect(result.success).toBe(false)
	})

	test("deve aceitar 7 dias com intervalos válidos", () => {
		const days = Array.from({ length: 7 }, (_, i) => ({
			weekday: i,
			intervals: [{ open: "08:00", close: "18:00" }],
		}))
		expect(operatingHoursSchema.safeParse(days).success).toBe(true)
	})

	test("deve aceitar intervalos adjacentes sem sobreposição (prev.close === next.open)", () => {
		const result = operatingHoursSchema.safeParse([
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "12:00", close: "14:00" },
				],
			},
		])
		expect(result.success).toBe(true)
	})
})
