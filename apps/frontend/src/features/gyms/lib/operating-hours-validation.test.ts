import { describe, expect, test } from "vitest"
import { validateOperatingHoursInput } from "./operating-hours-validation"

describe("validateOperatingHoursInput", () => {
	test("preserva array vazio como horários explicitamente fechados", () => {
		const result = validateOperatingHoursInput([])

		expect(result).toMatchObject({
			success: true,
			value: [],
			error: null,
			dayErrors: {},
		})
	})

	test("preserva null como limpeza explícita", () => {
		const result = validateOperatingHoursInput(null)

		expect(result).toMatchObject({
			success: true,
			value: null,
			error: null,
			dayErrors: {},
		})
	})

	test("preserva undefined como campo não tocado", () => {
		const result = validateOperatingHoursInput(undefined)

		expect(result).toMatchObject({
			success: true,
			value: undefined,
			error: null,
			dayErrors: {},
		})
	})
})
