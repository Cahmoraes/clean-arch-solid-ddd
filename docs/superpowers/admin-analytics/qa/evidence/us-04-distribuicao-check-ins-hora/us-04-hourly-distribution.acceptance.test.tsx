/**
 * US-04 — Acceptance Test
 * Como admin, eu quero ver a distribuição de check-ins por hora do dia
 * para que eu possa identificar os horários de pico e tomar decisões sobre
 * staff e infraestrutura.
 *
 * Requisitos verificados:
 * - FR-009: Exibe gráfico de barras (BarChart) com a distribuição de check-ins
 *   por hora do dia (0h–23h) para identificação de horários de pico
 *
 * Cobertura backend verificada via análise estática:
 * - AnalyticsCheckInRepository interface expõe hourlyDistribution: HourlyCount[]
 * - PrismaAnalyticsCheckInRepository usa EXTRACT(HOUR FROM created_at)::int
 *   agrupando por hora, retornando { hour: number, count: number }[]
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
	BarChart: ({ children, data }: { children: ReactNode; data?: unknown[] }) => (
		<div data-testid="bar-chart" data-items={data ? String(data.length) : "0"}>
			{children}
		</div>
	),
	Line: () => null,
	Bar: ({ dataKey }: { dataKey?: string }) => (
		<div data-testid="bar" data-datakey={dataKey} />
	),
	XAxis: ({ dataKey }: { dataKey?: string }) => (
		<div data-testid="x-axis" data-datakey={dataKey} />
	),
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

/** Generates a 24-hour distribution array (hours 0–23) */
function make24HourDistribution() {
	return Array.from({ length: 24 }, (_, hour) => ({
		hour,
		count: Math.floor(Math.random() * 50) + 1,
	}))
}

describe("US-04 — Distribuição de check-ins por hora do dia", () => {
	test("FR-009: exibe BarChart com dados de hourlyDistribution quando carregados", () => {
		const hourlyDistribution = make24HourDistribution()

		mockUseCheckInMetrics.mockReturnValue({
			data: {
				totalCheckIns: hourlyDistribution.reduce((s, r) => s + r.count, 0),
				dailySeries: [{ date: "2024-01-01", count: 5 }],
				hourlyDistribution,
			},
			isPending: false,
			isError: false,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="7d" />, { wrapper })

		// BarChart deve estar no DOM
		expect(screen.getByTestId("bar-chart")).toBeInTheDocument()

		// Título da seção deve estar presente
		expect(screen.getByText("Distribuição por hora")).toBeInTheDocument()
	})

	test("FR-009: BarChart recebe todos os 24 pontos de hora do dia (0h–23h)", () => {
		const hourlyDistribution = make24HourDistribution()

		mockUseCheckInMetrics.mockReturnValue({
			data: {
				totalCheckIns: 100,
				dailySeries: [{ date: "2024-01-01", count: 100 }],
				hourlyDistribution,
			},
			isPending: false,
			isError: false,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="30d" />, { wrapper })

		const barChart = screen.getByTestId("bar-chart")
		// Verifica que BarChart recebeu 24 itens de dados
		expect(barChart).toHaveAttribute("data-items", "24")
	})

	test("FR-009: XAxis usa dataKey='hour' para identificar horas do dia", () => {
		const hourlyDistribution = [
			{ hour: 6, count: 10 },
			{ hour: 12, count: 25 },
			{ hour: 18, count: 15 },
		]

		mockUseCheckInMetrics.mockReturnValue({
			data: {
				totalCheckIns: 50,
				dailySeries: [{ date: "2024-01-01", count: 50 }],
				hourlyDistribution,
			},
			isPending: false,
			isError: false,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="7d" />, { wrapper })

		// XAxis deve usar 'hour' como dataKey para mostrar 0h–23h
		const xAxis = screen.getByTestId("x-axis")
		expect(xAxis).toHaveAttribute("data-datakey", "hour")
	})

	test("FR-009: Bar usa dataKey='count' para exibir contagem de check-ins por hora", () => {
		const hourlyDistribution = [
			{ hour: 8, count: 42 },
			{ hour: 9, count: 58 },
		]

		mockUseCheckInMetrics.mockReturnValue({
			data: {
				totalCheckIns: 100,
				dailySeries: [{ date: "2024-01-01", count: 100 }],
				hourlyDistribution,
			},
			isPending: false,
			isError: false,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="7d" />, { wrapper })

		// Bar deve usar 'count' como dataKey
		const bar = screen.getByTestId("bar")
		expect(bar).toHaveAttribute("data-datakey", "count")
	})

	test("FR-009: não exibe BarChart quando hourlyDistribution está vazio", () => {
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

		expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument()
	})

	test("exibe skeleton durante carregamento (sem gráfico de barras)", () => {
		mockUseCheckInMetrics.mockReturnValue({
			data: undefined,
			isPending: true,
			isError: false,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="30d" />, { wrapper })

		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0)
		expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument()
	})

	test("exibe mensagem de erro quando isError=true (sem gráfico de barras)", () => {
		mockUseCheckInMetrics.mockReturnValue({
			data: undefined,
			isPending: false,
			isError: true,
		} as ReturnType<typeof useCheckInMetrics>)

		render(<CheckInMetricsSection period="7d" />, { wrapper })

		expect(
			screen.getByText("Erro ao carregar dados de check-ins."),
		).toBeInTheDocument()
		expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument()
	})
})
