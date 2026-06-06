import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

vi.mock("next/navigation", () => ({
	useParams: () => ({ id: "gym-1" }),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

import AdminEditarAcademiaPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("AdminEditarAcademiaPage", () => {
	test("pré-preenche o formulário com os dados da academia", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json({
					id: "gym-1",
					title: "Academia Volt",
					description: "Top",
					phone: "11999999999",
					address: "Rua A, 100",
					cnpj: "11222333000181",
					imageKey: null,
					latitude: -23.5,
					longitude: -46.6,
				}),
			),
		)
		renderWithProviders(<AdminEditarAcademiaPage />)
		await waitFor(() =>
			expect(screen.getByTestId("gym-form-title")).toHaveValue("Academia Volt"),
		)
		expect(screen.getByTestId("gym-form-cnpj")).toHaveValue("11222333000181")
	})
})
