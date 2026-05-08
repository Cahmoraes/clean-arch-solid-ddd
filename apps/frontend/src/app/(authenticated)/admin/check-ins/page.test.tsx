import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from "sonner"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminCheckInsPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("AdminCheckInsPage", () => {
	beforeEach(() => {
		vi.mocked(toast.success).mockClear()
		vi.mocked(toast.error).mockClear()
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-1", role: "ADMIN" },
		})
	})

	it("lista check-ins pendentes e valida ao clicar em 'Validar'", async () => {
		let listCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () => {
				listCalls += 1
				const items =
					listCalls === 1
						? [
								{
									id: "c1",
									gymId: "g1",
									gymTitle: "Iron Gym",
									validatedAt: null,
									rejectedAt: null,
									status: "pending",
									createdAt: "2024-01-01T10:00:00Z",
								},
							]
						: []
				return HttpResponse.json(
					{ items, page: 1, total: items.length },
					{ status: 200 },
				)
			}),
			http.patch(`${apiBaseUrl}/check-ins/validate`, () =>
				HttpResponse.json({ checkInId: "c1" }, { status: 200 }),
			),
		)

		const user = userEvent.setup()
		renderWithProviders(<AdminCheckInsPage />)

		const validateButton = await screen.findByTestId("checkin-approve-c1")
		await user.click(validateButton)

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(
				"Check-in aprovado com sucesso.",
			)
		})

		await waitFor(() => {
			expect(screen.getByText(/nenhum check-in pendente/i)).toBeInTheDocument()
		})
		expect(listCalls).toBeGreaterThanOrEqual(2)
	})

	it("exibe EmptyState quando não há check-ins pendentes", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json({ items: [], page: 1, total: 0 }, { status: 200 }),
			),
		)
		renderWithProviders(<AdminCheckInsPage />)
		expect(
			await screen.findByText(/nenhum check-in pendente/i),
		).toBeInTheDocument()
	})

	it("exibe erro amigável ao falhar validação (409)", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json(
					{
						items: [
							{
								id: "c1",
								gymId: "g1",
								gymTitle: "Iron Gym",
								validatedAt: null,
								rejectedAt: null,
								status: "pending",
								createdAt: "2024-01-01T10:00:00Z",
							},
						],
						page: 1,
						total: 1,
					},
					{ status: 200 },
				),
			),
			http.patch(`${apiBaseUrl}/check-ins/validate`, () =>
				HttpResponse.json({ message: "expired" }, { status: 409 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<AdminCheckInsPage />)
		const validateButton = await screen.findByTestId("checkin-approve-c1")
		await user.click(validateButton)
		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Conflito ao processar a solicitação.",
			)
		})
	})

	it("rejeita um check-in pendente ao clicar em 'Rejeitar'", async () => {
		let listCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () => {
				listCalls += 1
				const items =
					listCalls === 1
						? [
								{
									id: "c2",
									gymId: "g1",
									gymTitle: "Iron Gym",
									validatedAt: null,
									rejectedAt: null,
									status: "pending",
									createdAt: "2024-01-01T10:00:00Z",
								},
							]
						: []
				return HttpResponse.json(
					{ items, page: 1, total: items.length },
					{ status: 200 },
				)
			}),
			http.patch(`${apiBaseUrl}/check-ins/reject`, () =>
				HttpResponse.json(
					{ rejectedAt: "2024-01-01T11:00:00Z" },
					{ status: 200 },
				),
			),
		)

		const user = userEvent.setup()
		renderWithProviders(<AdminCheckInsPage />)

		const rejectButton = await screen.findByTestId("checkin-reject-c2")
		await user.click(rejectButton)

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("Check-in rejeitado.")
		})

		await waitFor(() => {
			expect(screen.getByText(/nenhum check-in pendente/i)).toBeInTheDocument()
		})
		expect(listCalls).toBeGreaterThanOrEqual(2)
	})

	it("exibe erro amigável ao falhar rejeição", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json(
					{
						items: [
							{
								id: "c3",
								gymId: "g1",
								gymTitle: "Iron Gym",
								validatedAt: null,
								rejectedAt: null,
								status: "pending",
								createdAt: "2024-01-01T10:00:00Z",
							},
						],
						page: 1,
						total: 1,
					},
					{ status: 200 },
				),
			),
			http.patch(`${apiBaseUrl}/check-ins/reject`, () =>
				HttpResponse.json({ message: "not found" }, { status: 404 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<AdminCheckInsPage />)
		const rejectButton = await screen.findByTestId("checkin-reject-c3")
		await user.click(rejectButton)
		await waitFor(
			() => {
				expect(toast.error).toHaveBeenCalled()
			},
			{ timeout: 3000 },
		)
	})

	it("exibe apenas botão rejeitar para check-in validado", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json(
					{
						items: [
							{
								id: "c4",
								gymId: "g1",
								gymTitle: "Iron Gym",
								validatedAt: "2024-01-01T10:30:00Z",
								rejectedAt: null,
								status: "validated",
								createdAt: "2024-01-01T10:00:00Z",
							},
						],
						page: 1,
						total: 1,
					},
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<AdminCheckInsPage />)

		const rejectButton = await screen.findByTestId("checkin-reject-c4")
		expect(rejectButton).toBeInTheDocument()

		const approveButton = screen.queryByTestId("checkin-approve-c4")
		expect(approveButton).not.toBeInTheDocument()
	})
})
