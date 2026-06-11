/**
 * US-03 — Acceptance Test
 * Como admin, eu quero ver a evolução diária de check-ins em forma de gráfico
 * para que eu possa identificar tendências, sazonalidade e dias de baixa frequência.
 *
 * Requisitos verificados:
 * - FR-007: Exibe gráfico de linha (LineChart) com evolução diária de check-ins
 * - FR-010: Seção aberta por padrão ao carregar a página (Collapsible open=true)
 *
 * Nota sobre FR-008: shouldAggregateByWeek() existe no VO AnalyticsPeriod (backend)
 * e retorna true para "3m" e "12m", porém o PrismaAnalyticsCheckInRepository
 * NÃO usa esse método — a query SQL sempre agrega por dia (DATE_TRUNC('day')).
 * Gap documentado em result.json.
 */
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, Suspense } from "react"
import { describe, expect, test, vi } from "vitest"

// Mock recharts — não renderiza em happy-dom
vi.mock("recharts", () => ({
	LineChart: ({ children }: { children: ReactNode }) => (
		<div data-testid="line-chart">{children}</div>
	),
	BarChart: ({ children }: { children: ReactNode }) => (
		<div data-testid="bar-chart">{children}</div>
	),
	Line: () => null,
	Bar: () => null,
	XAxis: () => null,
	YAxis: () => null,
	CartesianGrid: () => null,
	ResponsiveContainer: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
}))

// Mock shadcn chart wrapper
vi.mock("@/components/ui/chart", () => ({
	ChartContainer: ({ children }: { children: ReactNode }) => (
		<div data-testid="chart-container">{children}</div>
	),
	ChartTooltip: () => null,
	ChartTooltipContent: () => null,
}))

// Mock Collapsible — preserva open prop para verificar estado padrão
vi.mock("@/components/ui/collapsible", () => ({
	Collapsible: ({
		children,
		open,
	}: {
		children: ReactNode
		open?: boolean
	}) => (
		<div data-testid="collapsible" data-open={String(open)}>
			{children}
		</div>
	),
	CollapsibleTrigger: ({ children }: { children: ReactNode }) => (
		<button type="button" data-testid="collapsible-trigger">
			{children}
		</button>
	),
	CollapsibleContent: ({ children }: { children: ReactNode }) => (
		<div data-testid="collapsible-content">{children}</div>
	),
}))

// Mock Skeleton
vi.mock("@/components/ui/skeleton", () => ({
	Skeleton: () => <div data-testid="skeleton" />,
}))

// Mock useCheckInMetrics
vi.mock(
	"/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend/src/features/admin/analytics/api/use-check-in-metrics",
	() => ({
		useCheckInMetrics: vi.fn(),
	}),
)

import { useCheckInMetrics } from "/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend/src/features/admin/analytics/api/use-check-in-metrics"
import { CheckInMetricsSection } from "/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend/src/features/admin/analytics/components/check-in-metrics-section"

function wrapper({ children }: { children: ReactNode }) {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	return (
		<QueryClientProvider client={qc}>
			<Suspense fallback={null}>{children}</Suspense>
		</QueryClientProvider>
	)
}

const mockUseCheckInMetrics = vi.mocked(useCheckInMetrics)

describe("US-03 — CheckInMetricsSection", () => {
	test("FR-010: seção está aberta por padrão (Collapsible open=true)", () => {
		mockUseCheckInMetrics.mockReturnValue({
			data: undefined,
			isPending: true,
			isError: false,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="7d" />, { wrapper })

		const collapsible = screen.getByTestId("collapsible")
		expect(collapsible).toHaveAttribute("data-open", "true")
	})

	test("FR-007: exibe LineChart com dados de dailySeries quando carregados", () => {
		mockUseCheckInMetrics.mockReturnValue({
			data: {
				totalCheckIns: 5,
				dailySeries: [
					{ date: "2024-01-01", count: 3 },
					{ date: "2024-01-02", count: 2 },
				],
				hourlyDistribution: [],
			},
			isPending: false,
			isError: false,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="7d" />, { wrapper })

		expect(screen.getByTestId("line-chart")).toBeInTheDocument()
		expect(
			screen.getByText("Evolução de check-ins"),
		).toBeInTheDocument()
	})

	test("FR-007: não exibe LineChart quando dailySeries está vazio", () => {
		mockUseCheckInMetrics.mockReturnValue({
			data: {
				totalCheckIns: 0,
				dailySeries: [],
				hourlyDistribution: [],
			},
			isPending: false,
			isError: false,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="7d" />, { wrapper })

		expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument()
		expect(
			screen.getByText("Nenhum check-in registrado neste período."),
		).toBeInTheDocument()
	})

	test("exibe skeleton durante carregamento", () => {
		mockUseCheckInMetrics.mockReturnValue({
			data: undefined,
			isPending: true,
			isError: false,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="30d" />, { wrapper })

		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0)
	})

	test("exibe mensagem de erro quando isError=true", () => {
		mockUseCheckInMetrics.mockReturnValue({
			data: undefined,
			isPending: false,
			isError: true,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="7d" />, { wrapper })

		expect(
			screen.getByText("Erro ao carregar dados de check-ins."),
		).toBeInTheDocument()
	})
})
