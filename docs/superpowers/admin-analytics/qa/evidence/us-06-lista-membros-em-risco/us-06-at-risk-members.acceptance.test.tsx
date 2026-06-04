/**
 * Acceptance test — US-06: Lista de membros em risco
 * Requisito coberto: FR-012
 *
 * FR-012 — A seção deve exibir a lista de membros em risco: sem check-in nos
 * últimos 14 dias. Cada item deve mostrar nome do membro e quantidade de dias
 * desde o último check-in.
 *
 * Estratégia: vi.hoisted + vi.mock em useRetentionMetrics para controlar os
 * dados sem depender de rede ou MSW. A seção é aberta via userEvent.click no
 * trigger do Collapsible (comportamento real — sem mock de UI).
 *
 * Executar via: node run-acceptance.mjs
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockUseRetentionMetrics } = vi.hoisted(() => ({
	mockUseRetentionMetrics: vi.fn(),
}))

vi.mock(
	"@/features/admin/analytics/api/use-retention-metrics",
	() => ({
		useRetentionMetrics: mockUseRetentionMetrics,
	}),
)

import { RetentionMetricsSection } from "@/features/admin/analytics/components/retention-metrics-section"

// ---------------------------------------------------------------------------
// Wrapper de teste
// ---------------------------------------------------------------------------

function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: 0, gcTime: 0 },
		},
	})
}

function Wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={createTestQueryClient()}>
			{children}
		</QueryClientProvider>
	)
}

function renderSection(period: "7d" | "30d" | "90d" = "30d") {
	return render(<RetentionMetricsSection period={period} />, {
		wrapper: Wrapper,
	})
}

// ---------------------------------------------------------------------------
// Helpers de estado do mock
// ---------------------------------------------------------------------------

function makeRetentionData(
	members: Array<{ id: string; name: string; daysSinceLastCheckIn: number }>,
) {
	return {
		data: {
			activeCount: 42,
			inactiveCount: 10,
			churnRate: 19.2,
			atRiskMembers: members,
		},
		isPending: false,
		isError: false,
	}
}

// ---------------------------------------------------------------------------
// FR-012 — Lista de membros em risco (nome + dias sem check-in)
// ---------------------------------------------------------------------------

describe("FR-012 — RetentionMetricsSection exibe lista de membros em risco", () => {
	beforeEach(() => {
		mockUseRetentionMetrics.mockReturnValue(makeRetentionData([]))
	})

	test("renderiza nome e dias sem check-in para cada membro em risco", async () => {
		mockUseRetentionMetrics.mockReturnValue(
			makeRetentionData([
				{ id: "user-1", name: "Alice Souza", daysSinceLastCheckIn: 20 },
				{ id: "user-2", name: "Bruno Lima", daysSinceLastCheckIn: 15 },
			]),
		)

		renderSection()

		// Abre a seção colapsável
		await userEvent.click(screen.getByRole("button", { name: /retenção/i }))

		await waitFor(() => {
			// Nomes dos membros em risco
			expect(screen.getByText("Alice Souza")).toBeInTheDocument()
			expect(screen.getByText("Bruno Lima")).toBeInTheDocument()

			// Dias sem check-in de cada membro
			expect(screen.getByText("20 dias sem check-in")).toBeInTheDocument()
			expect(screen.getByText("15 dias sem check-in")).toBeInTheDocument()
		})
	})

	test("exibe contador de membros em risco no cabeçalho da lista", async () => {
		mockUseRetentionMetrics.mockReturnValue(
			makeRetentionData([
				{ id: "user-1", name: "Carlos Melo", daysSinceLastCheckIn: 18 },
				{ id: "user-2", name: "Diana Rocha", daysSinceLastCheckIn: 22 },
				{ id: "user-3", name: "Eduardo Nunes", daysSinceLastCheckIn: 30 },
			]),
		)

		renderSection()

		await userEvent.click(screen.getByRole("button", { name: /retenção/i }))

		await waitFor(() => {
			// Cabeçalho deve mostrar "(3)"
			expect(screen.getByText(/membros em risco \(3\)/i)).toBeInTheDocument()
		})
	})

	test("exibe mensagem vazia quando não há membros em risco", async () => {
		mockUseRetentionMetrics.mockReturnValue(makeRetentionData([]))

		renderSection()

		await userEvent.click(screen.getByRole("button", { name: /retenção/i }))

		await waitFor(() => {
			expect(
				screen.getByText(/nenhum membro em risco no momento/i),
			).toBeInTheDocument()
		})
	})

	test("renderiza membros em risco com período de 7d", async () => {
		mockUseRetentionMetrics.mockReturnValue(
			makeRetentionData([
				{ id: "user-x", name: "Fernanda Costa", daysSinceLastCheckIn: 14 },
			]),
		)

		renderSection("7d")

		await userEvent.click(screen.getByRole("button", { name: /retenção/i }))

		await waitFor(() => {
			expect(screen.getByText("Fernanda Costa")).toBeInTheDocument()
			expect(screen.getByText("14 dias sem check-in")).toBeInTheDocument()
		})
	})

	test("renderiza múltiplos membros com suas contagens individuais de dias", async () => {
		mockUseRetentionMetrics.mockReturnValue(
			makeRetentionData([
				{ id: "a", name: "Gabriel Pires", daysSinceLastCheckIn: 16 },
				{ id: "b", name: "Helena Castro", daysSinceLastCheckIn: 28 },
				{ id: "c", name: "Igor Ferreira", daysSinceLastCheckIn: 45 },
			]),
		)

		renderSection()

		await userEvent.click(screen.getByRole("button", { name: /retenção/i }))

		await waitFor(() => {
			expect(screen.getByText("Gabriel Pires")).toBeInTheDocument()
			expect(screen.getByText("16 dias sem check-in")).toBeInTheDocument()
			expect(screen.getByText("Helena Castro")).toBeInTheDocument()
			expect(screen.getByText("28 dias sem check-in")).toBeInTheDocument()
			expect(screen.getByText("Igor Ferreira")).toBeInTheDocument()
			expect(screen.getByText("45 dias sem check-in")).toBeInTheDocument()
		})
	})
})

// ---------------------------------------------------------------------------
// Estados de loading e erro
// ---------------------------------------------------------------------------

describe("RetentionMetricsSection — estados de loading e erro (US-06 context)", () => {
	test("exibe skeletons enquanto os dados carregam (isPending=true)", async () => {
		mockUseRetentionMetrics.mockReturnValue({
			data: undefined,
			isPending: true,
			isError: false,
		})

		renderSection()

		await userEvent.click(screen.getByRole("button", { name: /retenção/i }))

		// Não deve exibir conteúdo de membros
		expect(screen.queryByText(/dias sem check-in/i)).not.toBeInTheDocument()
	})

	test("exibe mensagem de erro quando a requisição falha (isError=true)", async () => {
		mockUseRetentionMetrics.mockReturnValue({
			data: undefined,
			isPending: false,
			isError: true,
		})

		renderSection()

		await userEvent.click(screen.getByRole("button", { name: /retenção/i }))

		await waitFor(() => {
			expect(
				screen.getByText(/erro ao carregar dados de retenção/i),
			).toBeInTheDocument()
		})
	})
})
