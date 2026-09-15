import { fireEvent, screen, waitFor } from "@testing-library/react"
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

vi.mock("next/link", () => ({
	default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a {...props} data-next-link="true" />
	),
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
	test("deve renderizar o link Voltar para a busca", async () => {
		renderWithProviders(<AdminEditarAcademiaPage />)
		const backLink = await screen.findByTestId("gym-edit-back-link")
		expect(backLink).toBeInTheDocument()
		expect(backLink).toHaveAttribute("href", "/academias")
		expect(backLink).toHaveTextContent("Voltar para a busca")
		expect(backLink).toHaveAttribute("data-next-link", "true")
	})

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
					operatingHours: [
						{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
					],
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
		await userEvent.click(
			screen.getByText(/horário de funcionamento \(opcional\)/i),
		)
		expect(screen.getByLabelText("Segunda abertura 1")).toHaveValue("08:00")
	})

	test("envia operatingHours atualizado no PUT", async () => {
		let received: Record<string, unknown> | null = null
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
					operatingHours: [
						{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
					],
				}),
			),
			http.put(`${apiBaseUrl}/gyms/:id`, async ({ request }) => {
				received = (await request.json()) as Record<string, unknown>
				return HttpResponse.json({ message: "Gym updated", id: "gym-123" })
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<AdminEditarAcademiaPage />)

		await waitFor(() =>
			expect(screen.getByTestId("gym-form-title")).toHaveValue("Academia Volt"),
		)
		await user.click(screen.getByText(/horário de funcionamento \(opcional\)/i))
		fireEvent.change(screen.getByLabelText("Segunda fechamento 1"), {
			target: { value: "13:00" },
		})
		await user.click(screen.getByTestId("gym-form-submit"))

		await waitFor(() => {
			expect(received).toMatchObject({
				operatingHours: [
					{ weekday: 1, intervals: [{ open: "08:00", close: "13:00" }] },
				],
			})
		})
		expect(mockReplace).toHaveBeenCalledWith("/academias/gym-123")
	})

	test("envia operatingHours nulo no PUT ao limpar horário existente", async () => {
		let received: Record<string, unknown> | null = null
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
					operatingHours: [
						{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
					],
				}),
			),
			http.put(`${apiBaseUrl}/gyms/:id`, async ({ request }) => {
				received = (await request.json()) as Record<string, unknown>
				return HttpResponse.json({ message: "Gym updated", id: "gym-123" })
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<AdminEditarAcademiaPage />)

		await waitFor(() =>
			expect(screen.getByTestId("gym-form-title")).toHaveValue("Academia Volt"),
		)
		await user.click(screen.getByText(/horário de funcionamento \(opcional\)/i))
		await user.click(screen.getByLabelText("Segunda Fechado"))
		await user.click(screen.getByTestId("gym-form-submit"))

		await waitFor(() => {
			expect(received).toMatchObject({
				operatingHours: null,
			})
		})
	})

	test("deve renderizar GymImageEditOverlay em vez de GymImageUploader", async () => {
		renderWithProviders(<AdminEditarAcademiaPage />)
		await screen.findByTestId("gym-image-edit-overlay-mock")
		expect(screen.queryByTestId("gym-image-input")).not.toBeInTheDocument()
	})

	test("deve renderizar o botão Descartar alterações com variant outline", async () => {
		renderWithProviders(<AdminEditarAcademiaPage />)
		const cancelBtn = await screen.findByRole("button", {
			name: /descartar alterações/i,
		})
		expect(cancelBtn).toBeInTheDocument()
		expect(cancelBtn).toHaveClass("border-border")
	})

	test("deve navegar para /academias ao clicar em Descartar alterações", async () => {
		const user = userEvent.setup()
		renderWithProviders(<AdminEditarAcademiaPage />)
		const cancelBtn = await screen.findByRole("button", {
			name: /descartar alterações/i,
		})
		await user.click(cancelBtn)
		expect(mockPush).toHaveBeenCalledWith("/academias")
	})

	test("não deve chamar mockPush ao submeter o formulário", async () => {
		renderWithProviders(<AdminEditarAcademiaPage />)
		await screen.findByTestId("gym-form-submit")
		expect(mockPush).not.toHaveBeenCalled()
	})
})
