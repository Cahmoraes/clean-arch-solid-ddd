/**
 * US-05 — Taxa de retenção e contagem de membros ativos/inativos
 *
 * NOTA: Este arquivo é uma cópia de referência para o relatório de QA.
 * O arquivo executável está em:
 *   apps/frontend/src/features/admin/analytics/components/retention-metrics-section.test.tsx
 *
 * FR-011: exibe activeCount, inactiveCount e churnRate em percentual;
 *         membro inativo = sem check-in nos últimos 30 dias (janela fixa)
 * FR-013: seção fechada por padrão ao carregar a página
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockUseRetentionMetrics } = vi.hoisted(() => ({
	mockUseRetentionMetrics: vi.fn(),
}))

vi.mock("../api/use-retention-metrics", () => ({
	useRetentionMetrics: mockUseRetentionMetrics,
}))

import { RetentionMetricsSection } from "./retention-metrics-section"

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

const mockRetentionData = {
	activeCount: 42,
	inactiveCount: 18,
	churnRate: 30.0,
	atRiskMembers: [],
}

describe("US-05 — RetentionMetricsSection", () => {
	beforeEach(() => {
		mockUseRetentionMetrics.mockReturnValue({
			data: mockRetentionData,
			isPending: false,
			isError: false,
		})
	})

	describe("FR-013 — fechado por padrão", () => {
		test("deve renderizar a seção fechada ao carregar a página", () => {
			renderSection()

			expect(
				screen.getByRole("button", { name: /retenção/i }),
			).toBeInTheDocument()

			expect(screen.queryByText("Membros ativos")).not.toBeInTheDocument()
			expect(screen.queryByText("Membros inativos")).not.toBeInTheDocument()
			expect(screen.queryByText("Taxa de churn")).not.toBeInTheDocument()
		})
	})

	describe("FR-011 — exibição de activeCount, inactiveCount e churnRate", () => {
		test("deve exibir activeCount ao abrir a seção", async () => {
			renderSection()

			await userEvent.click(
				screen.getByRole("button", { name: /retenção/i }),
			)

			await waitFor(() => {
				expect(screen.getByText("42")).toBeInTheDocument()
				expect(screen.getByText("Membros ativos")).toBeInTheDocument()
			})
		})

		test("deve exibir inactiveCount ao abrir a seção", async () => {
			renderSection()

			await userEvent.click(
				screen.getByRole("button", { name: /retenção/i }),
			)

			await waitFor(() => {
				expect(screen.getByText("18")).toBeInTheDocument()
				expect(screen.getByText("Membros inativos")).toBeInTheDocument()
			})
		})

		test("deve exibir churnRate em percentual ao abrir a seção", async () => {
			renderSection()

			await userEvent.click(
				screen.getByRole("button", { name: /retenção/i }),
			)

			await waitFor(() => {
				expect(screen.getByText("30.0%")).toBeInTheDocument()
				expect(screen.getByText("Taxa de churn")).toBeInTheDocument()
			})
		})

		test("deve indicar janela fixa de 30 dias para membros ativos", async () => {
			renderSection()

			await userEvent.click(
				screen.getByRole("button", { name: /retenção/i }),
			)

			await waitFor(() => {
				expect(screen.getByText("(últimos 30 dias)")).toBeInTheDocument()
			})
		})

		test("deve indicar ausência de check-in em 30+ dias para membros inativos", async () => {
			renderSection()

			await userEvent.click(
				screen.getByRole("button", { name: /retenção/i }),
			)

			await waitFor(() => {
				expect(
					screen.getByText("(sem check-in em 30+ dias)"),
				).toBeInTheDocument()
			})
		})
	})

	describe("estados da UI", () => {
		test("deve exibir mensagem de erro quando a requisição falha", async () => {
			mockUseRetentionMetrics.mockReturnValue({
				data: undefined,
				isPending: false,
				isError: true,
			})

			renderSection()

			await userEvent.click(
				screen.getByRole("button", { name: /retenção/i }),
			)

			await waitFor(() => {
				expect(
					screen.getByText("Erro ao carregar dados de retenção."),
				).toBeInTheDocument()
			})
		})
	})
})
