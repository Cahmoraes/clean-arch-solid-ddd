/**
 * US-07 — Acceptance Test
 * Como admin, eu quero ver a curva de crescimento de membros e o número de
 * novos cadastros por período para que eu possa avaliar o resultado de ações
 * de aquisição.
 *
 * Requisitos verificados:
 * - FR-014: Exibe AreaChart com a evolução cumulativa do total de membros ativos
 * - FR-015: Exibe BarChart com o número de novos membros por semana ou mês
 * - FR-016: Seção está fechada por padrão ao carregar a página (isOpen = false)
 *
 * Cobertura backend verificada via análise estática:
 * - GrowthAnalytics interface expõe activeMembersTrend: PeriodCount[] e
 *   newMembersPerPeriod: PeriodCount[]
 * - PrismaAnalyticsUserRepository.fetchGrowthAnalytics retorna ambos os arrays
 *   calculados via SQL com DATE_TRUNC agrupando por semana ou dia conforme período
 */
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, Suspense } from "react"
import { describe, expect, test, vi } from "vitest"

// Mock recharts — não renderiza em happy-dom
vi.mock("recharts", () => ({
	AreaChart: ({
		children,
		data,
	}: {
		children: ReactNode
		data?: unknown[]
	}) => (
		<div data-testid="area-chart" data-items={data ? String(data.length) : "0"}>
			{children}
		</div>
	),
	BarChart: ({
		children,
		data,
	}: {
		children: ReactNode
		data?: unknown[]
	}) => (
		<div data-testid="bar-chart" data-items={data ? String(data.length) : "0"}>
			{children}
		</div>
	),
	Area: ({ dataKey }: { dataKey?: string }) => (
		<div data-testid="area" data-datakey={dataKey} />
	),
	Bar: ({ dataKey }: { dataKey?: string }) => (
		<div data-testid="bar" data-datakey={dataKey} />
	),
	XAxis: ({ dataKey }: { dataKey?: string }) => (
		<div data-testid="x-axis" data-datakey={dataKey} />
	),
	YAxis: () => null,
	CartesianGrid: () => null,
	defs: ({ children }: { children: ReactNode }) => <>{children}</>,
	linearGradient: ({ children }: { children: ReactNode }) => <>{children}</>,
	stop: () => null,
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

// Mock Collapsible — preserva open prop para verificar estado padrão (FR-016)
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

// Mock useGrowthMetrics — caminho absoluto necessário para arquivos fora de src/
vi.mock(
	"/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend/src/features/admin/analytics/api/use-growth-metrics",
	() => ({
		useGrowthMetrics: vi.fn(),
	}),
)

import { useGrowthMetrics } from "/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend/src/features/admin/analytics/api/use-growth-metrics"
import { GrowthMetricsSection } from "/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend/src/features/admin/analytics/components/growth-metrics-section"

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

const mockUseGrowthMetrics = vi.mocked(useGrowthMetrics)

/** Cria séries de tendência de membros ativos */
function makeActiveMembersTrend(count = 4) {
	return Array.from({ length: count }, (_, i) => ({
		date: `2024-0${i + 1}-01`,
		count: (i + 1) * 10,
	}))
}

/** Cria séries de novos membros por período */
function makeNewMembersPerPeriod(count = 4) {
	return Array.from({ length: count }, (_, i) => ({
		date: `2024-0${i + 1}-01`,
		count: i + 5,
	}))
}

describe("US-07 — Curva de crescimento de membros", () => {
	describe("FR-016: seção fechada por padrão", () => {
		test("deve renderizar Collapsible com open=false por padrão", () => {
			mockUseGrowthMetrics.mockReturnValue({
				data: undefined,
				isPending: true,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="30d" />, { wrapper })

			const collapsible = screen.getByTestId("collapsible")
			expect(collapsible).toHaveAttribute("data-open", "false")
		})

		test("deve manter seção fechada mesmo quando dados estão disponíveis", () => {
			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 100,
					newMembersCount: 10,
					activeMembersTrend: makeActiveMembersTrend(),
					newMembersPerPeriod: makeNewMembersPerPeriod(),
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="30d" />, { wrapper })

			const collapsible = screen.getByTestId("collapsible")
			expect(collapsible).toHaveAttribute("data-open", "false")
		})
	})

	describe("FR-014: AreaChart com evolução cumulativa de membros ativos", () => {
		test("deve exibir AreaChart quando activeMembersTrend tem dados", () => {
			const activeMembersTrend = makeActiveMembersTrend(4)

			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 100,
					newMembersCount: 20,
					activeMembersTrend,
					newMembersPerPeriod: makeNewMembersPerPeriod(4),
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="30d" />, { wrapper })

			expect(screen.getByTestId("area-chart")).toBeInTheDocument()
		})

		test("deve passar activeMembersTrend ao AreaChart com número correto de pontos", () => {
			const activeMembersTrend = makeActiveMembersTrend(6)

			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 200,
					newMembersCount: 30,
					activeMembersTrend,
					newMembersPerPeriod: makeNewMembersPerPeriod(6),
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="12m" />, { wrapper })

			const areaChart = screen.getByTestId("area-chart")
			expect(areaChart).toHaveAttribute("data-items", "6")
		})

		test("Area deve usar dataKey='count' para exibir contagem de membros ativos", () => {
			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 50,
					newMembersCount: 5,
					activeMembersTrend: makeActiveMembersTrend(2),
					newMembersPerPeriod: makeNewMembersPerPeriod(2),
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="7d" />, { wrapper })

			const area = screen.getByTestId("area")
			expect(area).toHaveAttribute("data-datakey", "count")
		})

		test("não deve exibir AreaChart quando activeMembersTrend está vazio", () => {
			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 0,
					newMembersCount: 0,
					activeMembersTrend: [],
					newMembersPerPeriod: [],
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="7d" />, { wrapper })

			expect(screen.queryByTestId("area-chart")).not.toBeInTheDocument()
		})
	})

	describe("FR-015: BarChart com novos membros por período", () => {
		test("deve exibir BarChart quando newMembersPerPeriod tem dados", () => {
			const newMembersPerPeriod = makeNewMembersPerPeriod(4)

			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 100,
					newMembersCount: 20,
					activeMembersTrend: makeActiveMembersTrend(4),
					newMembersPerPeriod,
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="30d" />, { wrapper })

			expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
		})

		test("deve passar newMembersPerPeriod ao BarChart com número correto de pontos", () => {
			const newMembersPerPeriod = makeNewMembersPerPeriod(8)

			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 300,
					newMembersCount: 40,
					activeMembersTrend: makeActiveMembersTrend(8),
					newMembersPerPeriod,
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="3m" />, { wrapper })

			const barChart = screen.getByTestId("bar-chart")
			expect(barChart).toHaveAttribute("data-items", "8")
		})

		test("Bar deve usar dataKey='count' para exibir contagem de novos membros", () => {
			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 50,
					newMembersCount: 5,
					activeMembersTrend: makeActiveMembersTrend(2),
					newMembersPerPeriod: makeNewMembersPerPeriod(2),
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="7d" />, { wrapper })

			const bar = screen.getByTestId("bar")
			expect(bar).toHaveAttribute("data-datakey", "count")
		})

		test("não deve exibir BarChart quando newMembersPerPeriod está vazio", () => {
			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 0,
					newMembersCount: 0,
					activeMembersTrend: [],
					newMembersPerPeriod: [],
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="7d" />, { wrapper })

			expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument()
		})
	})

	describe("Estados de carregamento e erro", () => {
		test("deve exibir skeletons durante carregamento", () => {
			mockUseGrowthMetrics.mockReturnValue({
				data: undefined,
				isPending: true,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="30d" />, { wrapper })

			const skeletons = screen.getAllByTestId("skeleton")
			expect(skeletons.length).toBeGreaterThan(0)
		})

		test("deve exibir mensagem de erro quando isError=true", () => {
			mockUseGrowthMetrics.mockReturnValue({
				data: undefined,
				isPending: false,
				isError: true,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="30d" />, { wrapper })

			expect(
				screen.getByText(/erro ao carregar dados de crescimento/i),
			).toBeInTheDocument()
		})

		test("deve exibir estado vazio quando ambas as séries estão vazias", () => {
			mockUseGrowthMetrics.mockReturnValue({
				data: {
					totalMembers: 0,
					newMembersCount: 0,
					activeMembersTrend: [],
					newMembersPerPeriod: [],
				},
				isPending: false,
				isError: false,
			} as ReturnType<typeof useGrowthMetrics>)

			render(<GrowthMetricsSection period="7d" />, { wrapper })

			expect(
				screen.getByText(/nenhum dado de crescimento neste período/i),
			).toBeInTheDocument()
		})
	})
})
