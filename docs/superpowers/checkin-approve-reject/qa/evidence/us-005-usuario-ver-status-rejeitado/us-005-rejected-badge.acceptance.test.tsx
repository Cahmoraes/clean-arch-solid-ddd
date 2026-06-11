import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it } from "vitest"
import CheckInsPage from "@/app/(authenticated)/check-ins/page"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("US-005: Como usuário, eu quero ver claramente quando um dos meus check-ins foi rejeitado", () => {
	beforeEach(() => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "user-1", role: "MEMBER" },
		})
	})

	it("RF-017: exibe badge 'Rejeitado' com cor neutra para check-in com status rejected", async () => {
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
								rejectedAt: "2024-01-01T11:00:00Z",
								status: "rejected",
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

		renderWithProviders(<CheckInsPage />)

		// Assert badge is rendered with "Rejeitado" text
		const statusBadge = await screen.findByTestId("checkin-status-c1")
		expect(statusBadge).toBeInTheDocument()
		expect(statusBadge).toHaveTextContent(/rejeitado/i)

		// Assert icon is rendered (XCircle icon)
		const icon = statusBadge.querySelector("[aria-hidden=true]")
		expect(icon).toBeInTheDocument()

		// Assert neutral/gray color classes are applied
		expect(statusBadge).toHaveClass("text-muted-foreground")
	})

	it("RF-011: não exibe nenhum botão de ação para check-in rejeitado", async () => {
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
								rejectedAt: "2024-01-01T11:00:00Z",
								status: "rejected",
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

		renderWithProviders(<CheckInsPage />)

		// Assert no action buttons are rendered
		await waitFor(() => {
			expect(screen.queryByTestId("checkin-approve-c1")).not.toBeInTheDocument()
			expect(screen.queryByTestId("checkin-reject-c1")).not.toBeInTheDocument()
		})
	})

	it("RF-012: usuário não-admin não vê nenhum botão de ação na página /check-ins", async () => {
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
							{
								id: "c2",
								gymId: "g2",
								gymTitle: "Power House",
								validatedAt: "2024-01-02T11:00:00Z",
								rejectedAt: null,
								status: "validated",
								createdAt: "2024-01-02T10:00:00Z",
							},
						],
						page: 1,
						total: 2,
					},
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<CheckInsPage />)

		// Assert no action buttons are rendered for any check-in
		await waitFor(() => {
			expect(screen.queryByTestId("checkin-approve-c1")).not.toBeInTheDocument()
			expect(screen.queryByTestId("checkin-reject-c1")).not.toBeInTheDocument()
			expect(screen.queryByTestId("checkin-approve-c2")).not.toBeInTheDocument()
			expect(screen.queryByTestId("checkin-reject-c2")).not.toBeInTheDocument()
		})
	})

	it("combined: rejected check-in displays badge and no action buttons", async () => {
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
								rejectedAt: "2024-01-01T11:00:00Z",
								status: "rejected",
								createdAt: "2024-01-01T10:00:00Z",
							},
							{
								id: "pending-1",
								gymId: "g2",
								gymTitle: "Power House",
								validatedAt: null,
								rejectedAt: null,
								status: "pending",
								createdAt: "2024-01-02T10:00:00Z",
							},
						],
						page: 1,
						total: 2,
					},
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<CheckInsPage />)

		// Verify rejected check-in shows badge
		const rejectedBadge = await screen.findByTestId("checkin-status-rejected-1")
		expect(rejectedBadge).toHaveTextContent(/rejeitado/i)

		// Verify rejected check-in has no action buttons
		expect(
			screen.queryByTestId("checkin-approve-rejected-1"),
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId("checkin-reject-rejected-1"),
		).not.toBeInTheDocument()

		// Verify pending check-in also has no action buttons (non-admin user)
		expect(
			screen.queryByTestId("checkin-approve-pending-1"),
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId("checkin-reject-pending-1"),
		).not.toBeInTheDocument()
	})
})
