import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AcademiasPage from "./page"

vi.mock("next/navigation", () => ({
	useSearchParams: vi.fn(),
}))

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

const fakeGyms = (count: number, prefix = "gym") =>
	Array.from({ length: count }, (_, i) => ({
		id: `${prefix}-${i + 1}`,
		title: `Iron Gym ${i + 1}`,
		description: i % 2 === 0 ? `Descrição ${i + 1}` : null,
		phone: null,
		latitude: -23.5,
		longitude: -46.6,
	}))

function setUser(role: "MEMBER" | "ADMIN") {
	useAuthStore.setState({
		accessToken: "token",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

describe("AcademiasPage", () => {
	beforeEach(() => {
		useAuthStore.getState().clear()
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("") as unknown as ReturnType<typeof useSearchParams>,
		)
	})

	test("exibe botão 'Cadastrar Academia' para usuário ADMIN", () => {
		setUser("ADMIN")
		renderWithProviders(<AcademiasPage />)
		const link = screen.getByTestId("gym-create-link")
		expect(link).toBeInTheDocument()
		expect(link).toHaveAttribute("href", "/admin/academias/nova")
	})

	test("não exibe botão 'Cadastrar Academia' para usuário MEMBER", () => {
		setUser("MEMBER")
		renderWithProviders(<AcademiasPage />)
		expect(screen.queryByTestId("gym-create-link")).not.toBeInTheDocument()
	})

	test("não exibe botão quando usuário não está autenticado", () => {
		renderWithProviders(<AcademiasPage />)
		expect(screen.queryByTestId("gym-create-link")).not.toBeInTheDocument()
	})

	test("exibe lista de academias no load inicial (modo browse)", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms`, () =>
				HttpResponse.json(fakeGyms(3), { status: 200 }),
			),
		)
		renderWithProviders(<AcademiasPage />)

		expect(await screen.findByTestId("gym-card-gym-1")).toBeInTheDocument()
		expect(screen.getByTestId("gym-card-gym-3")).toBeInTheDocument()
	})

	test("exibe Skeleton durante loading e lista após resposta MSW", async () => {
		const deferred = createDeferred()
		server.use(
			http.get(`${apiBaseUrl}/gyms/search/:name`, async () => {
				await deferred.promise
				return HttpResponse.json(fakeGyms(3), { status: 200 })
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<AcademiasPage />)

		await user.type(screen.getByTestId("gym-search-input"), "Iron")
		await user.click(screen.getByTestId("gym-search-submit"))

		expect(await screen.findByTestId("gym-results-loading")).toBeInTheDocument()

		deferred.resolve()

		await waitFor(() => {
			expect(
				screen.queryByTestId("gym-results-loading"),
			).not.toBeInTheDocument()
		})
		expect(screen.getByTestId("gym-card-gym-1")).toBeInTheDocument()
		expect(screen.getByTestId("gym-card-gym-3")).toBeInTheDocument()
	})

	test("exibe EmptyState quando busca não retorna resultados (404)", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/search/:name`, () =>
				HttpResponse.json({ message: "no gyms" }, { status: 404 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<AcademiasPage />)
		await user.type(screen.getByTestId("gym-search-input"), "Inexistente")
		await user.click(screen.getByTestId("gym-search-submit"))

		expect(
			await screen.findByText(/nenhuma academia encontrada/i),
		).toBeInTheDocument()
	})

	test("paginação: Próxima incrementa página e nova request é feita", async () => {
		const requestedPages: string[] = []
		const RESULTS_PER_PAGE = 20
		server.use(
			http.get(`${apiBaseUrl}/gyms/search/:name`, ({ request }) => {
				const url = new URL(request.url)
				requestedPages.push(url.searchParams.get("page") ?? "1")
				return HttpResponse.json(fakeGyms(RESULTS_PER_PAGE), { status: 200 })
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<AcademiasPage />)
		await user.type(screen.getByTestId("gym-search-input"), "Iron")
		await user.click(screen.getByTestId("gym-search-submit"))

		await screen.findByTestId("gym-card-gym-1")
		expect(screen.getByTestId("gym-pagination-page").textContent).toMatch(
			/Página 1/,
		)

		await user.click(screen.getByTestId("gym-pagination-next"))

		await waitFor(() => {
			expect(screen.getByTestId("gym-pagination-page").textContent).toMatch(
				/Página 2/,
			)
		})
		await waitFor(() => {
			expect(requestedPages).toContain("2")
		})
	})

	test("links dos cards apontam para detalhe da academia", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/search/:name`, () =>
				HttpResponse.json(fakeGyms(2), { status: 200 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<AcademiasPage />)
		await user.type(screen.getByTestId("gym-search-input"), "Iron")
		await user.click(screen.getByTestId("gym-search-submit"))

		const card = await screen.findByTestId("gym-card-gym-1")
		expect(within(card).getByText(/iron gym 1/i)).toBeInTheDocument()
		expect(card.getAttribute("href")).toBe("/academias/gym-1")
	})

	test("RF-015: pré-preenche o campo de busca com o valor do parâmetro ?search=", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("search=Academia+Fit") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		renderWithProviders(<AcademiasPage />)
		expect(screen.getByTestId("gym-search-input")).toHaveValue("Academia Fit")
	})

	test("exibe ícone de edição nos cards para usuário ADMIN", async () => {
		setUser("ADMIN")
		server.use(
			http.get(`${apiBaseUrl}/gyms`, () =>
				HttpResponse.json(fakeGyms(2), { status: 200 }),
			),
		)
		renderWithProviders(<AcademiasPage />)

		const editLink = await screen.findByTestId("gym-edit-gym-1")
		expect(editLink).toHaveAttribute("href", "/admin/academias/gym-1/editar")
	})

	test("não exibe ícone de edição nos cards para usuário MEMBER", async () => {
		setUser("MEMBER")
		server.use(
			http.get(`${apiBaseUrl}/gyms`, () =>
				HttpResponse.json(fakeGyms(2), { status: 200 }),
			),
		)
		renderWithProviders(<AcademiasPage />)

		expect(await screen.findByTestId("gym-card-gym-1")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-edit-gym-1")).not.toBeInTheDocument()
	})
})
