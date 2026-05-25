import { describe, expect, test } from "vitest"
import type { CheckIn } from "@/features/check-ins/api"
import {
	computeHeatmap,
	computeStatusDistribution,
	computeStreak,
	computeThisMonth,
	computeWeeklyFrequency,
} from "./use-dashboard-metrics"

function makeCheckIn(
	overrides: Partial<CheckIn> & { createdAt: string },
): CheckIn {
	return {
		id: "ci-1",
		gymId: "gym-1",
		gymTitle: "Smart Fit",
		userId: "u-1",
		validatedAt: overrides.createdAt,
		rejectedAt: null,
		status: "validated",
		...overrides,
	}
}

const TODAY = new Date()
TODAY.setHours(12, 0, 0, 0)

function daysAgo(n: number): string {
	const d = new Date(TODAY)
	d.setDate(d.getDate() - n)
	return d.toISOString()
}

describe("computeThisMonth", () => {
	test("conta apenas check-ins do mês atual", () => {
		const thisMonth = makeCheckIn({ createdAt: daysAgo(0) })
		const lastMonth = makeCheckIn({
			createdAt: new Date(
				TODAY.getFullYear(),
				TODAY.getMonth() - 1,
				15,
			).toISOString(),
		})
		expect(computeThisMonth([thisMonth, lastMonth])).toBe(1)
	})

	test("retorna 0 para lista vazia", () => {
		expect(computeThisMonth([])).toBe(0)
	})
})

describe("computeStreak", () => {
	test("conta dias consecutivos com check-in validado", () => {
		const checkIns = [
			makeCheckIn({ createdAt: daysAgo(0), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(2), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(4), status: "validated" }), // quebra a sequência
		]
		expect(computeStreak(checkIns)).toBe(3)
	})

	test("ignora check-ins pendentes e rejeitados no streak", () => {
		const checkIns = [
			makeCheckIn({ createdAt: daysAgo(0), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(1), status: "pending" }),
		]
		expect(computeStreak(checkIns)).toBe(1)
	})

	test("retorna 0 para lista vazia", () => {
		expect(computeStreak([])).toBe(0)
	})
})

describe("computeWeeklyFrequency", () => {
	test("agrupa check-ins por dia da semana", () => {
		// Forçar um check-in em segunda-feira (dayOfWeek=1)
		const monday = new Date(TODAY)
		while (monday.getDay() !== 1) {
			monday.setDate(monday.getDate() - 1)
		}
		const checkIns = [
			makeCheckIn({ createdAt: monday.toISOString() }),
			makeCheckIn({ createdAt: monday.toISOString() }),
		]
		const freq = computeWeeklyFrequency(checkIns)
		expect(freq[1]).toBe(2)
		expect(freq.length).toBe(7)
	})

	test("retorna array de zeros para lista vazia", () => {
		expect(computeWeeklyFrequency([])).toEqual([0, 0, 0, 0, 0, 0, 0])
	})
})

describe("computeHeatmap", () => {
	test("retorna 90 dias", () => {
		const result = computeHeatmap([])
		expect(result).toHaveLength(90)
	})

	test("mapeia intensidade corretamente", () => {
		const checkIns = [
			makeCheckIn({ createdAt: daysAgo(0) }),
			makeCheckIn({ createdAt: daysAgo(0) }),
			makeCheckIn({ createdAt: daysAgo(0) }),
			makeCheckIn({ createdAt: daysAgo(0) }),
		]
		const result = computeHeatmap(checkIns)
		const today = result[result.length - 1]
		expect(today.count).toBe(4)
		expect(today.intensity).toBe(4)
	})

	test("dia sem check-in tem intensidade 0", () => {
		const result = computeHeatmap([])
		expect(result[0].intensity).toBe(0)
		expect(result[0].count).toBe(0)
	})
})

describe("computeStatusDistribution", () => {
	test("conta por status", () => {
		const checkIns = [
			makeCheckIn({ createdAt: daysAgo(0), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(2), status: "pending" }),
			makeCheckIn({ createdAt: daysAgo(3), status: "rejected" }),
		]
		expect(computeStatusDistribution(checkIns)).toEqual({
			validated: 2,
			pending: 1,
			rejected: 1,
		})
	})

	test("retorna zeros para lista vazia", () => {
		expect(computeStatusDistribution([])).toEqual({
			validated: 0,
			pending: 0,
			rejected: 0,
		})
	})
})
