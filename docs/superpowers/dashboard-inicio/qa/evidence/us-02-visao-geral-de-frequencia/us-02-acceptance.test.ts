/**
 * Acceptance tests for US-02 — Visão geral de frequência
 *
 * RF-011: O card deve exibir inline: total de check-ins, check-ins do mês atual e sequência atual
 * RF-012: Exibir: Total de check-ins (lifetime), Check-ins do mês atual, Sequência atual, Status
 * RF-013: Durante carregamento, exibir skeleton em cada card individualmente
 * RF-014: A sequência deve contar dias consecutivos com ao menos 1 check-in validado,
 *         regressivamente a partir de hoje (ou ontem, se hoje não houver check-in validado)
 *
 * NOTA: Estes testes verificam a lógica de computeStreak e computeThisMonth.
 * Os testes de RF-011/RF-012/RF-013 são verificados por inspeção do componente KpiCards.
 */

import { describe, expect, test } from "vitest"
import type { CheckIn } from "@/features/check-ins/api"
import {
	computeStreak,
	computeThisMonth,
} from "@/features/dashboard/hooks/use-dashboard-metrics"

function makeCheckIn(
	overrides: Partial<CheckIn> & { createdAt: string },
): CheckIn {
	return {
		id: "ci-test",
		gymId: "gym-1",
		gymTitle: "Academia Teste",
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

describe("US-02 — Visão geral de frequência", () => {
	describe("RF-014: computeStreak — sequência regressiva a partir de hoje ou ontem", () => {
		test("quando hoje tem check-in validado, conta a partir de hoje", () => {
			const checkIns = [
				makeCheckIn({ createdAt: daysAgo(0), status: "validated" }),
				makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
				makeCheckIn({ createdAt: daysAgo(2), status: "validated" }),
			]
			expect(computeStreak(checkIns)).toBe(3)
		})

		test("quando hoje NÃO tem check-in validado, conta regressivamente a partir de ontem", () => {
			// RF-014 edge case: hoje sem check-in validado, sequência contada de ontem
			const checkIns = [
				// Nenhum check-in hoje (daysAgo(0))
				makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
				makeCheckIn({ createdAt: daysAgo(2), status: "validated" }),
				makeCheckIn({ createdAt: daysAgo(3), status: "validated" }),
			]
			expect(computeStreak(checkIns)).toBe(3)
		})

		test("quando há lacuna antes de ontem, a sequência para na lacuna", () => {
			// Hoje sem check-in, ontem com check-in, anteontem sem check-in, 3 dias atrás com check-in
			const checkIns = [
				makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
				// daysAgo(2) ausente — lacuna
				makeCheckIn({ createdAt: daysAgo(3), status: "validated" }),
			]
			expect(computeStreak(checkIns)).toBe(1)
		})

		test("check-in hoje com status pending não conta para sequência", () => {
			const checkIns = [
				makeCheckIn({ createdAt: daysAgo(0), status: "pending" }),
				makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
				makeCheckIn({ createdAt: daysAgo(2), status: "validated" }),
			]
			// Hoje tem pending (ignorado), então conta de ontem: ontem + anteontem = 2
			expect(computeStreak(checkIns)).toBe(2)
		})

		test("check-in hoje com status rejected não conta para sequência", () => {
			const checkIns = [
				makeCheckIn({ createdAt: daysAgo(0), status: "rejected" }),
				makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
			]
			// Hoje rejected (ignorado), conta de ontem: 1
			expect(computeStreak(checkIns)).toBe(1)
		})

		test("sem check-ins validados retorna sequência 0", () => {
			expect(computeStreak([])).toBe(0)
		})

		test("sequência interrompida no meio retorna apenas dias contínuos mais recentes", () => {
			const checkIns = [
				makeCheckIn({ createdAt: daysAgo(0), status: "validated" }),
				makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
				// daysAgo(2) ausente
				makeCheckIn({ createdAt: daysAgo(3), status: "validated" }),
				makeCheckIn({ createdAt: daysAgo(4), status: "validated" }),
			]
			expect(computeStreak(checkIns)).toBe(2)
		})
	})

	describe("computeThisMonth — check-ins do mês atual", () => {
		test("conta apenas check-ins do mês atual", () => {
			const mesPassado = new Date(
				TODAY.getFullYear(),
				TODAY.getMonth() - 1,
				15,
			).toISOString()
			const checkIns = [
				makeCheckIn({ createdAt: daysAgo(0) }),
				makeCheckIn({ createdAt: daysAgo(5) }),
				makeCheckIn({ createdAt: mesPassado }),
			]
			// Apenas 2 do mês atual (daysAgo(0) e daysAgo(5) podem ser do mês atual)
			// O terceiro é do mês passado
			const result = computeThisMonth(checkIns)
			// Verifica que o check-in do mês passado foi excluído
			expect(result).toBeLessThanOrEqual(2)
			expect(result).toBeGreaterThanOrEqual(1)
		})

		test("retorna 0 quando não há check-ins no mês atual", () => {
			const mesPassado = new Date(
				TODAY.getFullYear(),
				TODAY.getMonth() - 1,
				15,
			).toISOString()
			const checkIns = [makeCheckIn({ createdAt: mesPassado })]
			expect(computeThisMonth(checkIns)).toBe(0)
		})

		test("retorna 0 para lista vazia", () => {
			expect(computeThisMonth([])).toBe(0)
		})
	})
})
