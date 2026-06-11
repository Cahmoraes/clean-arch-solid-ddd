import { describe, expect, test } from "vitest"
import { AnalyticsPeriod } from "./analytics-period"

describe("AnalyticsPeriod", () => {
	test("deve aceitar período válido '7d' e retornar intervalo de 7 dias", () => {
		const result = AnalyticsPeriod.fromKey("7d")
		expect(result.isSuccess()).toBe(true)
		const period = result.forceSuccess().value
		const diffMs = period.to.getTime() - period.from.getTime()
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
		expect(diffDays).toBe(7)
		expect(period.key).toBe("7d")
	})

	test("deve aceitar '30d', '3m', '12m'", () => {
		expect(AnalyticsPeriod.fromKey("30d").isSuccess()).toBe(true)
		expect(AnalyticsPeriod.fromKey("3m").isSuccess()).toBe(true)
		expect(AnalyticsPeriod.fromKey("12m").isSuccess()).toBe(true)
	})

	test("deve rejeitar período inválido", () => {
		const result = AnalyticsPeriod.fromKey("invalid")
		expect(result.isFailure()).toBe(true)
	})

	test("shouldAggregateByWeek() deve retornar true para 3m e 12m", () => {
		expect(
			AnalyticsPeriod.fromKey("3m")
				.forceSuccess()
				.value.shouldAggregateByWeek(),
		).toBe(true)
		expect(
			AnalyticsPeriod.fromKey("12m")
				.forceSuccess()
				.value.shouldAggregateByWeek(),
		).toBe(true)
		expect(
			AnalyticsPeriod.fromKey("7d")
				.forceSuccess()
				.value.shouldAggregateByWeek(),
		).toBe(false)
		expect(
			AnalyticsPeriod.fromKey("30d")
				.forceSuccess()
				.value.shouldAggregateByWeek(),
		).toBe(false)
	})
})
