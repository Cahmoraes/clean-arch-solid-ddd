import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

vi.mock("@/features/dashboard/api", () => ({
	useDashboardHistory: () => ({
		data: [],
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	}),
}))

vi.mock("@/features/profile/api", () => ({
	useMe: () => ({ data: undefined, isLoading: false }),
	useMetrics: () => ({ data: undefined, isLoading: false }),
}))

import { DashboardPage } from "./dashboard-page"

describe("DashboardPage VOLT", () => {
	test("exibe o cabeçalho Dashboard", () => {
		renderWithProviders(<DashboardPage />)
		expect(
			screen.getByRole("heading", { name: /Dashboard/i }),
		).toBeInTheDocument()
	})

	test("renderiza a grade de KPIs", () => {
		renderWithProviders(<DashboardPage />)
		expect(screen.getByTestId("dashboard-stat-grid")).toBeInTheDocument()
	})
})
