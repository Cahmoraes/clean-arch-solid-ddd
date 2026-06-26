import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: mockReplace }),
	useParams: () => ({ id: "gym-123" }),
}))

vi.mock("@/features/gyms/components/gym-image-edit-overlay", () => ({
	GymImageEditOverlay: () => <div data-testid="gym-image-edit-overlay-mock" />,
}))

import AdminEditarAcademiaPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

beforeEach(() => {
	mockPush.mockClear()
	mockReplace.mockClear()
})

describe("AdminEditarAcademiaPage", () => {
	test("pré-preenche o formulário com os dados da academia", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json({
					id: "gym-123",
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
		expect(screen.getByTestId("gym-form-cnpj")).toHaveValue(
			"11.222.333/0001-81",
		)
	})

	test("deve renderizar GymImageEditOverlay em vez de GymImageUploader", async () => {
		renderWithProviders(<AdminEditarAcademiaPage />)
		await screen.findByTestId("gym-image-edit-overlay-mock")
		expect(screen.queryByTestId("gym-image-input")).not.toBeInTheDocument()
	})

	test("deve renderizar o botão Cancelar com variant outline", async () => {
		renderWithProviders(<AdminEditarAcademiaPage />)
		const cancelBtn = await screen.findByTestId("gym-form-cancel")
		expect(cancelBtn).toBeInTheDocument()
		expect(cancelBtn).toHaveClass("border-border")
	})

	test("deve navegar para /academias ao clicar em Cancelar", async () => {
		const user = userEvent.setup()
		renderWithProviders(<AdminEditarAcademiaPage />)
		const cancelBtn = await screen.findByTestId("gym-form-cancel")
		await user.click(cancelBtn)
		expect(mockPush).toHaveBeenCalledWith("/academias")
	})

	test("não deve chamar mockPush ao submeter o formulário", async () => {
		renderWithProviders(<AdminEditarAcademiaPage />)
		await screen.findByTestId("gym-form-submit")
		expect(mockPush).not.toHaveBeenCalled()
	})
})
