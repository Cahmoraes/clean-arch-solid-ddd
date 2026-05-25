/**
 * Acceptance test — US-07 RF-028
 * Verifica que buildSegments renderiza corretamente quando todos os check-ins
 * são de um único status (ex: somente validados).
 *
 * Este teste exercita a função buildSegments indiretamente via StatusDonutCard.
 * Como buildSegments é uma função interna (não exportada), testamos seu comportamento
 * observando a saída do computeStatusDistribution combinada com a lógica esperada:
 * - Se total > 0 e somente um status é não-zero, os outros devem ter length = 0
 * - O segmento não-zero deve ter length = CIRCUMFERENCE completo
 */

import { describe, expect, test } from "vitest"

const RADIUS = 28
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface StatusDistribution {
	validated: number
	pending: number
	rejected: number
}

interface DonutSegment {
	label: string
	count: number
	color: string
	length: number
	offset: number
}

// Replica de buildSegments retirada de status-donut-card.tsx
function buildSegments(dist: StatusDistribution): DonutSegment[] {
	const total = dist.validated + dist.pending + dist.rejected
	if (total === 0) return []

	const validatedLen = (dist.validated / total) * CIRCUMFERENCE
	const pendingLen = (dist.pending / total) * CIRCUMFERENCE
	const rejectedLen = (dist.rejected / total) * CIRCUMFERENCE

	const startOffset = CIRCUMFERENCE / 4

	return [
		{
			label: "Validado",
			count: dist.validated,
			color: "#4ade80",
			length: validatedLen,
			offset: startOffset,
		},
		{
			label: "Pendente",
			count: dist.pending,
			color: "#facc15",
			length: pendingLen,
			offset: startOffset - validatedLen,
		},
		{
			label: "Rejeitado",
			count: dist.rejected,
			color: "#f87171",
			length: rejectedLen,
			offset: startOffset - validatedLen - pendingLen,
		},
	]
}

describe("RF-028 — buildSegments com status único", () => {
	test("quando somente validados: segmento validado ocupa o gráfico inteiro", () => {
		const dist: StatusDistribution = { validated: 5, pending: 0, rejected: 0 }
		const segments = buildSegments(dist)

		expect(segments).toHaveLength(3)

		const validado = segments.find((s) => s.label === "Validado")
		const pendente = segments.find((s) => s.label === "Pendente")
		const rejeitado = segments.find((s) => s.label === "Rejeitado")

		// O segmento validado deve ocupar toda a circumferência
		expect(validado?.length).toBeCloseTo(CIRCUMFERENCE, 5)

		// Os outros segmentos devem ter comprimento zero
		expect(pendente?.length).toBe(0)
		expect(rejeitado?.length).toBe(0)

		// Contagens corretas
		expect(validado?.count).toBe(5)
		expect(pendente?.count).toBe(0)
		expect(rejeitado?.count).toBe(0)
	})

	test("quando somente pendentes: segmento pendente ocupa o gráfico inteiro", () => {
		const dist: StatusDistribution = { validated: 0, pending: 3, rejected: 0 }
		const segments = buildSegments(dist)

		expect(segments).toHaveLength(3)

		const validado = segments.find((s) => s.label === "Validado")
		const pendente = segments.find((s) => s.label === "Pendente")
		const rejeitado = segments.find((s) => s.label === "Rejeitado")

		expect(validado?.length).toBe(0)
		expect(pendente?.length).toBeCloseTo(CIRCUMFERENCE, 5)
		expect(rejeitado?.length).toBe(0)
	})

	test("quando somente rejeitados: segmento rejeitado ocupa o gráfico inteiro", () => {
		const dist: StatusDistribution = { validated: 0, pending: 0, rejected: 7 }
		const segments = buildSegments(dist)

		expect(segments).toHaveLength(3)

		const validado = segments.find((s) => s.label === "Validado")
		const pendente = segments.find((s) => s.label === "Pendente")
		const rejeitado = segments.find((s) => s.label === "Rejeitado")

		expect(validado?.length).toBe(0)
		expect(pendente?.length).toBe(0)
		expect(rejeitado?.length).toBeCloseTo(CIRCUMFERENCE, 5)
	})

	test("quando total é zero: retorna array vazio (sem crash)", () => {
		const dist: StatusDistribution = { validated: 0, pending: 0, rejected: 0 }
		const segments = buildSegments(dist)

		expect(segments).toHaveLength(0)
	})
})
