import { describe, expect, it } from "vitest"
import { computePeriodEnd } from "./compute-period-end"

describe("computePeriodEnd", () => {
	it("soma um mês em plano mensal", () => {
		const end = computePeriodEnd(
			new Date("2026-03-10T08:30:00.000Z"),
			"monthly",
		)

		expect(end.toISOString()).toBe("2026-04-10T08:30:00.000Z")
	})

	it("soma um ano em plano anual", () => {
		const end = computePeriodEnd(new Date("2026-03-10T08:30:00.000Z"), "yearly")

		expect(end.toISOString()).toBe("2027-03-10T08:30:00.000Z")
	})

	it("vira o ano quando o mês de início é dezembro", () => {
		const end = computePeriodEnd(
			new Date("2026-12-15T00:00:00.000Z"),
			"monthly",
		)

		expect(end.toISOString()).toBe("2027-01-15T00:00:00.000Z")
	})

	it("clampa 29 de fevereiro de ano bissexto para 28 de fevereiro no plano anual", () => {
		const end = computePeriodEnd(new Date("2028-02-29T00:00:00.000Z"), "yearly")

		expect(end.toISOString()).toBe("2029-02-28T00:00:00.000Z")
	})
})

describe("computePeriodEnd a partir de 31 de janeiro", () => {
	it("plano mensal em ano comum termina em 28 de fevereiro e não transborda para março", () => {
		const end = computePeriodEnd(
			new Date("2026-01-31T10:00:00.000Z"),
			"monthly",
		)

		expect(end.toISOString()).toBe("2026-02-28T10:00:00.000Z")
		expect(end.getUTCMonth()).toBe(1)
	})

	it("plano mensal em ano bissexto termina em 29 de fevereiro", () => {
		const end = computePeriodEnd(
			new Date("2028-01-31T10:00:00.000Z"),
			"monthly",
		)

		expect(end.toISOString()).toBe("2028-02-29T10:00:00.000Z")
	})

	it("plano mensal em 31 de março termina em 30 de abril", () => {
		const end = computePeriodEnd(
			new Date("2026-03-31T10:00:00.000Z"),
			"monthly",
		)

		expect(end.toISOString()).toBe("2026-04-30T10:00:00.000Z")
	})
})
