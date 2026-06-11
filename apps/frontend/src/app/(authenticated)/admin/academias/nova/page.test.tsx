import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, it, test, vi } from "vitest"

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

// Mock do uploader de imagem para evitar problemas com react-easy-crop em jsdom
vi.mock("@/features/gyms/components/gym-image-uploader", () => ({
	GymImageUploader: ({
		onCropped: _onCropped,
	}: {
		onCropped: (blob: Blob) => void
	}) => <input type="file" data-testid="gym-image-input" />,
}))

// Mock do componente de mapa para evitar problemas com Leaflet em jsdom
vi.mock("@/features/gyms/components/leaflet-map", () => ({
	default: ({
		onMapClick,
	}: {
		latitude: number | null
		longitude: number | null
		onMapClick: (lat: number, lng: number) => void
	}) => (
		<div data-testid="mock-map">
			<button
				type="button"
				data-testid="simulate-map-click"
				onClick={() => onMapClick(-23.5505, -46.6333)}
			>
				Simular clique
			</button>
		</div>
	),
}))

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminNovaAcademiaPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

// Nominatim retorna lat/lng para o endereço buscado
const NOMINATIM_SEARCH_RESULT = [
	{
		lat: "-23.5505",
		lon: "-46.6333",
		display_name: "Av. Paulista, 1578, São Paulo",
	},
]

describe("AdminNovaAcademiaPage", () => {
	it("envia formulário válido com endereço e coordenadas e redireciona", async () => {
		let received: Record<string, unknown> | null = null

		// MSW intercepta tanto o Nominatim quanto a API backend
		server.use(
			http.get("https://nominatim.openstreetmap.org/search", () => {
				return HttpResponse.json(NOMINATIM_SEARCH_RESULT)
			}),
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

		// Busca o endereço no mapa (address = o que o usuário digitou)
		await user.type(
			screen.getByTestId("gym-location-address"),
			"Av. Paulista, 1578",
		)
		await user.click(screen.getByTestId("gym-location-search"))

		// Aguarda geocodificação completar (lat/lng ficam visíveis)
		await waitFor(() => {
			expect(screen.getByTestId("gym-location-lat-display")).toHaveTextContent(
				"-23.5505",
			)
		})

		await user.click(screen.getByTestId("gym-form-submit"))

		await waitFor(() => {
			expect(received).toMatchObject({
				title: "Iron Gym",
				cnpj: "12345678000100",
				description: "Top gym",
				phone: "11999999999",
				// address = o que o usuário digitou (handleSearch não altera o campo address)
				address: "Av. Paulista, 1578",
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

	test("exibe o campo de upload de imagem", () => {
		renderWithProviders(<AdminNovaAcademiaPage />)
		expect(screen.getByTestId("gym-image-input")).toBeInTheDocument()
	})
})
