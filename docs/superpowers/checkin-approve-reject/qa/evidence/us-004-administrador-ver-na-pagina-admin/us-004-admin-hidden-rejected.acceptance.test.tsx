/**
 * Acceptance Test for US-004 — RF-014
 *
 * Requirement: RF-014 - Check-ins com status `rejected` devem ser ocultados
 * da página admin (já resolvidos).
 *
 * This test verifies that rejected check-ins are filtered out from the
 * admin check-ins page, even when returned by the API.
 */

import { screen } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import AdminCheckInsPage from "@/app/(authenticated)/admin/check-ins/page"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("AdminCheckInsPage — RF-014: Hidden Rejected Check-ins", () => {
	beforeEach(() => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-1", role: "ADMIN" },
		})
	})

	it("oculta check-ins rejeitados mesmo quando retornados pela API", async () => {
		// Mock API que retorna uma mistura de check-ins com diferentes status
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json(
					{
						items: [
							// Pending — deve ser exibido
							{
								id: "pending-1",
								gymId: "g1",
								gymTitle: "Iron Gym",
								validatedAt: null,
								rejectedAt: null,
								status: "pending",
								createdAt: "2024-01-01T10:00:00Z",
							},
							// Rejected — deve ser OCULTADO
							{
								id: "rejected-1",
								gymId: "g2",
								gymTitle: "Gold Gym",
								validatedAt: null,
								rejectedAt: "2024-01-01T10:15:00Z",
								status: "rejected",
								createdAt: "2024-01-01T10:00:00Z",
							},
							// Validated — deve ser exibido
							{
								id: "validated-1",
								gymId: "g3",
								gymTitle: "Platinum Gym",
								validatedAt: "2024-01-01T10:20:00Z",
								rejectedAt: null,
								status: "validated",
								createdAt: "2024-01-01T10:00:00Z",
							},
							// Another rejected — deve ser OCULTADO
							{
								id: "rejected-2",
								gymId: "g4",
								gymTitle: "Diamond Gym",
								validatedAt: null,
								rejectedAt: "2024-01-01T10:25:00Z",
								status: "rejected",
								createdAt: "2024-01-01T10:00:00Z",
							},
						],
						page: 1,
						total: 4,
					},
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<AdminCheckInsPage />)

		// Verify pending check-in is visible
		expect(await screen.findByText("Iron Gym")).toBeInTheDocument()

		// Verify validated check-in is visible
		expect(screen.getByText("Platinum Gym")).toBeInTheDocument()

		// Verify rejected check-ins are NOT visible (hidden)
		expect(screen.queryByText("Gold Gym")).not.toBeInTheDocument()

		expect(screen.queryByText("Diamond Gym")).not.toBeInTheDocument()

		// Verify the list shows exactly 2 items (pending + validated)
		// excluding the 2 rejected ones
		const listItems = screen.getAllByRole("listitem")
		expect(listItems).toHaveLength(2)
	})

	it("exibe EmptyState quando todos check-ins são rejeitados", async () => {
		// Mock API that returns only rejected check-ins
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json(
					{
						items: [
							{
								id: "rejected-1",
								gymId: "g1",
								gymTitle: "Iron Gym",
								validatedAt: null,
								rejectedAt: "2024-01-01T10:15:00Z",
								status: "rejected",
								createdAt: "2024-01-01T10:00:00Z",
							},
							{
								id: "rejected-2",
								gymId: "g2",
								gymTitle: "Gold Gym",
								validatedAt: null,
								rejectedAt: "2024-01-01T10:20:00Z",
								status: "rejected",
								createdAt: "2024-01-01T10:00:00Z",
							},
						],
						page: 1,
						total: 2,
					},
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<AdminCheckInsPage />)

		// Should display empty state instead of the rejected items
		expect(
			await screen.findByText(/nenhum check-in pendente/i),
		).toBeInTheDocument()

		// Verify rejected items are not visible
		expect(screen.queryByText("Iron Gym")).not.toBeInTheDocument()

		expect(screen.queryByText("Gold Gym")).not.toBeInTheDocument()
	})
})
