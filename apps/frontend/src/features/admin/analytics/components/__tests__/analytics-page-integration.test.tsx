import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

vi.mock("@/features/admin/analytics/api/use-check-in-metrics", () => ({
	useCheckInMetrics: () => ({
		data: {
			totalCheckIns: 1284,
			dailySeries: [
				{ date: "2026-06-01", count: 40 },
				{ date: "2026-06-02", count: 45 },
			],
		},
		isPending: false,
		isError: false,
	}),
}))

vi.mock("@/features/admin/analytics/api/use-retention-metrics", () => ({
	useRetentionMetrics: () => ({
		data: {
			activeCount: 312,
			inactiveCount: 44,
			churnRate: 4.2,
			atRiskMembers: [
				{ id: "1", name: "Ana Santos", daysSinceLastCheckIn: 21 },
			],
		},
		isPending: false,
		isError: false,
	}),
}))

vi.mock("@/features/admin/analytics/api/use-growth-metrics", () => ({
	useGrowthMetrics: () => ({
		data: {
			newMembersCount: 28,
			activeMembersTrend: [
				{ date: "2026-06-01", count: 310 },
				{ date: "2026-06-02", count: 312 },
			],
			newMembersPerPeriod: [
				{ date: "2026-06-01", count: 14 },
				{ date: "2026-06-02", count: 14 },
			],
		},
		isPending: false,
		isError: false,
	}),
}))

vi.mock("@/features/admin/analytics/hooks/use-analytics-period", () => ({
	useAnalyticsPeriod: () => ({ period: "30d", setPeriod: vi.fn() }),
}))

import AnalyticsPage from "@/app/(authenticated)/admin/analytics/page"

describe("AnalyticsPage (integração)", () => {
	test("não renderiza CheckInMetricsSection após o redesign", () => {
		render(<AnalyticsPage />)
		expect(
			screen.queryByTestId("check-in-metrics-section"),
		).not.toBeInTheDocument()
	})

	test("não renderiza RetentionMetricsSection após o redesign", () => {
		render(<AnalyticsPage />)
		expect(
			screen.queryByTestId("retention-metrics-section"),
		).not.toBeInTheDocument()
	})

	test("não renderiza GrowthMetricsSection após o redesign", () => {
		render(<AnalyticsPage />)
		expect(
			screen.queryByTestId("growth-metrics-section"),
		).not.toBeInTheDocument()
	})

	test("renderiza AtRiskAlertZone com membro em risco", () => {
		render(<AnalyticsPage />)
		expect(screen.getByText(/membros? em risco de churn/i)).toBeInTheDocument()
	})

	test("renderiza RetentionMiniStats com valores de retenção", () => {
		render(<AnalyticsPage />)
		expect(screen.getByText("312")).toBeInTheDocument()
		expect(screen.getByText("44")).toBeInTheDocument()
	})

	test("renderiza AnalyticsKpiRow com check-ins", () => {
		render(<AnalyticsPage />)
		expect(screen.getByText("1.284")).toBeInTheDocument()
	})
})
