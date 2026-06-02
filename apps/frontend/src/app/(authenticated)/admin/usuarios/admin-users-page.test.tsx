import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminUsersPage from "./page"

vi.mock("next/navigation", () => ({
	useSearchParams: vi.fn(),
}))

const isDesktopMock = vi.fn<() => boolean>(() => true)
vi.mock("@/lib/hooks/use-is-desktop", () => ({
	useIsDesktop: () => isDesktopMock(),
}))

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function buildUser(
	overrides: Partial<{
		id: string
		name: string
		email: string
		role: "ADMIN" | "MEMBER"
		status: "activated" | "suspended"
		createdAt: string
	}> = {},
) {
	return {
		id: "user-1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER" as const,
		status: "activated" as const,
		createdAt: "2024-01-15T12:00:00.000Z",
		...overrides,
	}
}

function mockUsersList(users = [buildUser()]) {
	server.use(
		http.get(`${apiBaseUrl}/users`, ({ request }) => {
			const url = new URL(request.url)
			const page = Number(url.searchParams.get("page") ?? "1")
			const limit = Number(url.searchParams.get("limit") ?? "10")

			return HttpResponse.json(
				{
					users,
					pagination: { page, limit, total: users.length },
				},
				{ status: 200 },
			)
		}),
	)
}

function renderPage() {
	return renderWithProviders(<AdminUsersPage />)
}

describe("AdminUsersPage modal integration", () => {
	beforeEach(() => {
		isDesktopMock.mockReturnValue(true)
		useAuthStore.setState({
			accessToken: "token",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-logged", role: "ADMIN" },
		})
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("") as unknown as ReturnType<typeof useSearchParams>,
		)
	})

	test("não exibe o painel de detalhes inicialmente", async () => {
		mockUsersList()
		renderPage()

		await waitFor(() => {
			expect(screen.getByTestId("admin-users-list")).toBeInTheDocument()
		})
		expect(screen.getByText(/selecione um usuário/i)).toBeInTheDocument()
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	test("abre o painel de detalhes inline ao clicar em um usuário (desktop)", async () => {
		const user = userEvent.setup()
		mockUsersList()
		renderPage()

		await user.click(await screen.findByTestId("user-row-user-1"))

		expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
		expect(screen.getByTestId("user-row-user-1")).toHaveAttribute(
			"aria-pressed",
			"true",
		)
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	test("troca o usuário do painel ao clicar em outra linha sem fechar (desktop)", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser(),
			buildUser({
				id: "user-2",
				name: "Carlos Lima",
				email: "carlos@example.com",
			}),
		])
		renderPage()

		await user.click(await screen.findByTestId("user-row-user-1"))
		expect(screen.getByTestId("user-row-user-1")).toHaveAttribute(
			"aria-pressed",
			"true",
		)

		await user.click(screen.getByTestId("user-row-user-2"))
		expect(screen.getByTestId("user-row-user-2")).toHaveAttribute(
			"aria-pressed",
			"true",
		)
		expect(screen.getByTestId("user-row-user-1")).toHaveAttribute(
			"aria-pressed",
			"false",
		)
		expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
	})

	test("no mobile, exibe o painel em Dialog e fecha no botão X", async () => {
		isDesktopMock.mockReturnValue(false)
		const user = userEvent.setup()
		mockUsersList()
		renderPage()

		await user.click(await screen.findByTestId("user-row-user-1"))

		const dialog = screen.getByRole("dialog")
		expect(within(dialog).getByText("Detalhes do usuário")).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /close/i }))

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		})
	})

	test("renderiza o campo de busca na página", async () => {
		mockUsersList()
		renderPage()

		const searchInput = await screen.findByTestId("admin-users-search")
		expect(searchInput).toBeInTheDocument()
		expect(searchInput).toHaveAttribute(
			"placeholder",
			"Buscar por nome ou e-mail...",
		)
	})

	test("lista todos usuários quando campo de busca está vazio", async () => {
		mockUsersList([
			buildUser(),
			buildUser({
				id: "user-2",
				name: "Carlos Lima",
				email: "carlos@example.com",
			}),
		])
		renderPage()

		await waitFor(() => {
			expect(screen.getByTestId("admin-users-list")).toBeInTheDocument()
		})
		expect(screen.getByTestId("admin-users-list").children).toHaveLength(2)
	})

	test("chama API com query param após digitar no campo de busca", async () => {
		const user = userEvent.setup()
		let receivedQuery: string | null = null

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				receivedQuery = url.searchParams.get("query")
				return HttpResponse.json(
					{
						users: [buildUser()],
						pagination: { page: 1, limit: 10, total: 1 },
					},
					{ status: 200 },
				)
			}),
		)

		renderPage()
		const searchInput = await screen.findByTestId("admin-users-search")
		await user.type(searchInput, "ana")

		await waitFor(
			() => {
				expect(receivedQuery).toBe("ana")
			},
			{ timeout: 2000 },
		)
	}, 20_000)

	test("RF-021: auto-seleciona usuário quando ?userId= está na URL e usuário existe na lista", async () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams(
				"userId=usr-1&query=Jo%C3%A3o",
			) as unknown as ReturnType<typeof useSearchParams>,
		)
		mockUsersList([
			buildUser({ id: "usr-1", name: "João", email: "joao@example.com" }),
		])
		renderPage()

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
		})
	})

	test("não dispara busca antes do debounce de 500ms", async () => {
		const user = userEvent.setup()
		let callCount = 0

		mockUsersList()

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				if (url.searchParams.get("query")) callCount++
				return HttpResponse.json(
					{
						users: [buildUser()],
						pagination: { page: 1, limit: 10, total: 1 },
					},
					{ status: 200 },
				)
			}),
		)

		renderPage()
		const searchInput = await screen.findByTestId("admin-users-search")
		await user.type(searchInput, "a")

		// Wait for the initial request to complete before checking
		await waitFor(() => {
			expect(screen.getByTestId("admin-users-list")).toBeInTheDocument()
		})

		const initialCallCount = callCount

		// Wait a bit (but less than debounce), then check no additional calls were made
		await new Promise((resolve) => setTimeout(resolve, 250))
		expect(callCount).toBe(initialCallCount)
	}, 20_000)
})
