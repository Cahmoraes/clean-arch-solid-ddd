import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const useParamsMock = vi.fn<() => { id: string }>()
vi.mock("next/navigation", () => ({
	useParams: () => useParamsMock(),
}))

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from "sonner"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import GymDetailPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

interface Deferred {
	promise: Promise<void>
	resolve: () => void
}

function createDeferred(): Deferred {
	let resolve: () => void = () => undefined
	const promise = new Promise<void>((res) => {
		resolve = res
	})
	return { promise, resolve }
}

function stubGeolocationDenied() {
	const geolocation = {
		getCurrentPosition: (
			_success: PositionCallback,
			error?: PositionErrorCallback,
		) => {
			error?.({
				code: 1,
				message: "denied",
				PERMISSION_DENIED: 1,
				POSITION_UNAVAILABLE: 2,
				TIMEOUT: 3,
			} as GeolocationPositionError)
		},
	} as unknown as Geolocation
	Object.defineProperty(navigator, "geolocation", {
		configurable: true,
		value: geolocation,
	})
}

describe("GymDetailPage", () => {
	beforeEach(() => {
		useParamsMock.mockReset()
		useParamsMock.mockReturnValue({ id: "gym-1" })
		vi.mocked(toast.success).mockClear()
		vi.mocked(toast.error).mockClear()
		stubGeolocationDenied()
	})

	afterEach(() => {
		delete (navigator as unknown as { geolocation?: unknown }).geolocation
	})

	it("exibe nome, descrição, telefone e localização da academia mockada", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, ({ params }) =>
				HttpResponse.json(
					{
						id: String(params.id),
						title: "Iron Gym",
						description: "A great gym",
						phone: "11999999999",
						latitude: -23.5505,
						longitude: -46.6333,
					},
					{ status: 200 },
				),
			),
		)
		renderWithProviders(<GymDetailPage />)

		await waitFor(() => {
			expect(screen.getByTestId("gym-detail-title")).toHaveTextContent(
				"Iron Gym",
			)
		})
		expect(screen.getByTestId("gym-detail-description")).toHaveTextContent(
			"A great gym",
		)
		expect(screen.getByTestId("gym-detail-phone")).toHaveTextContent(
			"11999999999",
		)
		expect(screen.getByTestId("gym-detail-location")).toHaveTextContent(
			"-23.5505",
		)
		expect(screen.getByTestId("gym-detail-checkin")).toBeInTheDocument()
	})

	it("exibe Skeleton durante loading", async () => {
		const deferred = createDeferred()
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, async () => {
				await deferred.promise
				return HttpResponse.json(
					{
						id: "gym-1",
						title: "Iron Gym",
						description: null,
						phone: null,
						latitude: 0,
						longitude: 0,
					},
					{ status: 200 },
				)
			}),
		)
		renderWithProviders(<GymDetailPage />)

		expect(await screen.findByTestId("gym-detail-loading")).toBeInTheDocument()
		deferred.resolve()
		await waitFor(() => {
			expect(screen.queryByTestId("gym-detail-loading")).not.toBeInTheDocument()
		})
	})

	it("exibe mensagem amigável em caso de erro de rede", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json({ message: "boom" }, { status: 500 }),
			),
		)
		renderWithProviders(<GymDetailPage />)

		expect(
			await screen.findByText(/não foi possível carregar a academia/i),
		).toBeInTheDocument()
	})

	it("realiza check-in: exibe loading e toast de sucesso", async () => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "user-1", role: "MEMBER" },
		})
		let postBody: unknown = null
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json(
					{
						id: "gym-1",
						title: "Iron Gym",
						description: null,
						phone: null,
						latitude: -23.5,
						longitude: -46.6,
					},
					{ status: 200 },
				),
			),
			http.post(`${apiBaseUrl}/check-ins`, async ({ request }) => {
				postBody = await request.json()
				return HttpResponse.json(
					{
						message: "Check-in created",
						id: "ck-1",
						date: "2024-01-01T10:00:00Z",
					},
					{ status: 201 },
				)
			}),
		)

		const user = userEvent.setup()
		renderWithProviders(<GymDetailPage />)
		const button = await screen.findByTestId("gym-detail-checkin")
		await user.click(button)

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(
				"Check-in registrado com sucesso!",
			)
		})
		expect(postBody).toMatchObject({
			gymId: "gym-1",
			userLatitude: -23.5,
			userLongitude: -46.6,
		})
	})

	it("exibe mensagem amigável quando check-in falha (409)", async () => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "user-1", role: "MEMBER" },
		})
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json(
					{
						id: "gym-1",
						title: "Iron Gym",
						description: null,
						phone: null,
						latitude: -23.5,
						longitude: -46.6,
					},
					{ status: 200 },
				),
			),
			http.post(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json({ message: "too far" }, { status: 409 }),
			),
		)

		const user = userEvent.setup()
		renderWithProviders(<GymDetailPage />)
		const button = await screen.findByTestId("gym-detail-checkin")
		await user.click(button)

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Você já fez check-in recentemente ou está distante demais da academia.",
			)
		})
	})
})
