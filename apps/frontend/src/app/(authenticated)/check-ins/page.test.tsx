import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import CheckInsPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("CheckInsPage", () => {
	beforeEach(() => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "user-1", role: "MEMBER" },
		})
	})

	it("exibe Skeleton durante loading e depois lista os check-ins", async () => {
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
								createdAt: "2024-01-01T10:00:00Z",
							},
							{
								id: "c2",
								gymId: "g2",
								gymTitle: "Power House",
								validatedAt: "2024-01-02T11:00:00Z",
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

		expect(await screen.findByTestId("checkins-skeleton")).toBeInTheDocument()
		await waitFor(() => {
			expect(screen.getByTestId("checkins-list")).toBeInTheDocument()
		})
		expect(screen.getByText("Iron Gym")).toBeInTheDocument()
		expect(screen.getByText("Power House")).toBeInTheDocument()
		expect(screen.getByTestId("checkin-status-c1")).toHaveTextContent(
			/pendente/i,
		)
		expect(screen.getByTestId("checkin-status-c2")).toHaveTextContent(
			/validado/i,
		)
	})

	it("exibe EmptyState quando histórico está vazio", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json({ items: [], page: 1, total: 0 }, { status: 200 }),
			),
		)
		renderWithProviders(<CheckInsPage />)

		expect(
			await screen.findByText(/você ainda não fez check-in/i),
		).toBeInTheDocument()
	})

	it("exibe mensagem amigável em caso de erro", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json({ message: "boom" }, { status: 500 }),
			),
		)
		renderWithProviders(<CheckInsPage />)

		expect(
			await screen.findByText(/não foi possível carregar seu histórico/i),
		).toBeInTheDocument()
	})

	it("navega para próxima página quando há paginação", async () => {
		const calls: string[] = []
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, ({ request }) => {
				const url = new URL(request.url)
				const page = url.searchParams.get("page") ?? "1"
				calls.push(page)
				return HttpResponse.json(
					{
						items: [
							{
								id: `c-${page}`,
								gymId: "g1",
								gymTitle: `Gym page ${page}`,
								validatedAt: null,
								createdAt: "2024-01-01T10:00:00Z",
							},
						],
						page: Number(page),
						total: 50,
					},
					{ status: 200 },
				)
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInsPage />)

		await waitFor(() => expect(calls).toContain("1"))
		const next = await screen.findByTestId("checkins-next")
		await user.click(next)
		await waitFor(() => expect(calls).toContain("2"))
	})
})
