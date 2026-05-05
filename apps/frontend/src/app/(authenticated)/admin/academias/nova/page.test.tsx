import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

const replace = vi.fn()
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		replace,
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
}))

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminNovaAcademiaPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("AdminNovaAcademiaPage", () => {
	it("envia formulário válido e redireciona para detalhe da academia criada", async () => {
		let received: Record<string, unknown> | null = null
		server.use(
			http.post(`${apiBaseUrl}/gyms`, async ({ request }) => {
				received = (await request.json()) as Record<string, unknown>
				return HttpResponse.json(
					{ message: "Gym created", id: "new-gym-77" },
					{ status: 201 },
				)
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<AdminNovaAcademiaPage />)

		await user.type(screen.getByTestId("gym-form-title"), "Iron Gym")
		await user.type(screen.getByTestId("gym-form-cnpj"), "12345678000100")
		await user.type(screen.getByTestId("gym-form-description"), "Top gym")
		await user.type(screen.getByTestId("gym-form-phone"), "11999999999")
		await user.type(
			screen.getByTestId("gym-form-address"),
			"Av. Paulista, 1578, São Paulo - SP",
		)

		const lat = screen.getByTestId("gym-form-latitude") as HTMLInputElement
		const lng = screen.getByTestId("gym-form-longitude") as HTMLInputElement
		await user.clear(lat)
		await user.type(lat, "-23.5505")
		await user.clear(lng)
		await user.type(lng, "-46.6333")

		await user.click(screen.getByTestId("gym-form-submit"))

		await waitFor(() => {
			expect(received).toMatchObject({
				title: "Iron Gym",
				cnpj: "12345678000100",
				description: "Top gym",
				phone: "11999999999",
				latitude: -23.5505,
				longitude: -46.6333,
			})
		})
		await waitFor(() => {
			expect(replace).toHaveBeenCalledWith("/academias/new-gym-77")
		})
	})

	it("bloqueia submissão quando dados são inválidos", async () => {
		const user = userEvent.setup()
		renderWithProviders(<AdminNovaAcademiaPage />)

		await user.click(screen.getByTestId("gym-form-submit"))

		expect(await screen.findByText(/informe o nome/i)).toBeInTheDocument()
	})
})
