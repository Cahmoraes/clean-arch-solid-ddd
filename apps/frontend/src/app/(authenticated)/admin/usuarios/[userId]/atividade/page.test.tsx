import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const mockReplace = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	useSearchParams: () => new URLSearchParams(),
}))

import { AdminUserActivityView } from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("AdminUserActivityView", () => {
	test("exibe o nome do usuário no cabeçalho e os eventos retornados", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId`, () =>
				HttpResponse.json({
					id: "user-1",
					name: "Maria Souza",
					email: "maria@example.com",
					role: "MEMBER",
				}),
			),
			http.get(`${apiBaseUrl}/users/:userId/activity`, () =>
				HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: new Date().toISOString(),
							},
						],
						pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
					},
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<AdminUserActivityView userId="user-1" />)

		expect(await screen.findByText(/maria souza/i)).toBeInTheDocument()
		expect(await screen.findByText("Login realizado")).toBeInTheDocument()
	})

	test("navega para a página seguinte ao clicar na paginação do topo", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId`, () =>
				HttpResponse.json({
					id: "user-1",
					name: "Maria Souza",
					email: "maria@example.com",
					role: "MEMBER",
				}),
			),
			http.get(`${apiBaseUrl}/users/:userId/activity`, () =>
				HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: new Date().toISOString(),
							},
						],
						pagination: { page: 1, pageSize: 20, total: 40, totalPages: 2 },
					},
					{ status: 200 },
				),
			),
		)

		const user = userEvent.setup()

		renderWithProviders(<AdminUserActivityView userId="user-1" />)
		await screen.findByText("Login realizado")

		await user.click(screen.getByTestId("admin-activity-top-page-2"))

		expect(mockReplace).toHaveBeenCalledWith("?page=2")
	})
})
