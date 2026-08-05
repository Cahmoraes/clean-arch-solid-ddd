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
		isSuperAdmin: boolean
	}> = {},
) {
	return {
		id: "user-1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER" as const,
		status: "activated" as const,
		createdAt: "2024-01-15T12:00:00.000Z",
		isSuperAdmin: false,
		...overrides,
	}
}

function buildManyUsers(count: number) {
	return Array.from({ length: count }, (_, index) =>
		buildUser({
			id: `user-${index + 1}`,
			name: `Usuário ${index + 1}`,
			email: `usuario${index + 1}@example.com`,
		}),
	)
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

		await user.click(
			within(await screen.findByTestId("user-row-user-1")).getByRole("button"),
		)

		expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("button"),
		).toHaveAttribute("aria-pressed", "true")
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

		await user.click(
			within(await screen.findByTestId("user-row-user-1")).getByRole("button"),
		)
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("button"),
		).toHaveAttribute("aria-pressed", "true")

		await user.click(
			within(screen.getByTestId("user-row-user-2")).getByRole("button"),
		)
		expect(
			within(screen.getByTestId("user-row-user-2")).getByRole("button"),
		).toHaveAttribute("aria-pressed", "true")
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("button"),
		).toHaveAttribute("aria-pressed", "false")
		expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
	})

	test("no mobile, exibe o painel em Dialog e fecha no botão X", async () => {
		isDesktopMock.mockReturnValue(false)
		const user = userEvent.setup()
		mockUsersList()
		renderPage()

		await user.click(
			within(await screen.findByTestId("user-row-user-1")).getByRole("button"),
		)

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

	test("mantém o status atualizado no painel após ativar usuário que sai do filtro Inativos", async () => {
		const user = userEvent.setup()
		let activated = false

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				const statusFilter = url.searchParams.get("status")
				const suspendedUser = buildUser({
					id: "user-1",
					name: "Jada Weissnat",
					email: "jada@example.com",
					status: "suspended",
				})
				// Filtro "inactive" → backend retorna apenas suspensos.
				// Após ativar, o usuário deixa de aparecer nesse filtro.
				const droppedFromFilter = statusFilter === "inactive" && activated
				const users = droppedFromFilter ? [] : [suspendedUser]
				return HttpResponse.json(
					{ users, pagination: { page: 1, limit: 10, total: users.length } },
					{ status: 200 },
				)
			}),
			http.patch(`${apiBaseUrl}/users/activate`, () => {
				activated = true
				return HttpResponse.json({}, { status: 200 })
			}),
		)

		renderPage()

		await user.click(await screen.findByRole("button", { name: /inativos/i }))
		await user.click(
			within(await screen.findByTestId("user-row-user-1")).getByRole("button"),
		)

		await user.click(screen.getByRole("button", { name: /mais ações/i }))
		await user.click(screen.getByRole("menuitem", { name: /^ativar$/i }))

		// Aguarda o refetch remover o usuário da lista filtrada (passa o flash do
		// optimistic update) antes de validar o status exibido no painel.
		await waitFor(() => {
			expect(screen.queryByTestId("user-row-user-1")).not.toBeInTheDocument()
		})

		expect(screen.queryAllByText("Inativo")).toHaveLength(0)
		expect(screen.getAllByText("Ativo").length).toBeGreaterThan(0)
	}, 20_000)

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

describe("seleção em massa", () => {
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

	test("marcar 2 checkboxes individuais deixa o checkbox de página em estado indeterminado", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1" }),
			buildUser({ id: "user-2" }),
			buildUser({ id: "user-3" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")

		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		await user.click(
			within(screen.getByTestId("user-row-user-2")).getByRole("checkbox"),
		)

		expect(screen.getByTestId("admin-users-select-page")).toHaveAttribute(
			"aria-checked",
			"mixed",
		)
	})

	test("marcar o checkbox de página seleciona todos os usuários elegíveis da página (e ignora os desabilitados)", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1", role: "MEMBER" }),
			buildUser({ id: "user-2", role: "MEMBER" }),
			buildUser({ id: "user-3", role: "ADMIN" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")

		await user.click(screen.getByTestId("admin-users-select-page"))

		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")
		expect(
			within(screen.getByTestId("user-row-user-2")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")
		expect(
			within(screen.getByTestId("user-row-user-3")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "false")
	})

	test("mudar de página limpa a seleção atual", async () => {
		const user = userEvent.setup()
		mockUsersList(buildManyUsers(15))
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")

		await user.click(screen.getByTestId("admin-users-page-2"))

		await waitFor(() => {
			expect(
				within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
			).toHaveAttribute("aria-checked", "false")
		})
	})

	test("mudar o filtro ativo limpa a seleção atual", async () => {
		const user = userEvent.setup()
		mockUsersList([buildUser({ id: "user-1" }), buildUser({ id: "user-2" })])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")

		await user.click(await screen.findByRole("button", { name: /inativos/i }))

		await waitFor(() => {
			expect(
				within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
			).toHaveAttribute("aria-checked", "false")
		})
	})

	test("digitar na busca (após o debounce) limpa a seleção atual", async () => {
		const user = userEvent.setup()
		mockUsersList([buildUser({ id: "user-1" }), buildUser({ id: "user-2" })])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")

		const searchInput = screen.getByTestId("admin-users-search")
		await user.type(searchInput, "ana")

		await waitFor(
			() => {
				expect(
					within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
				).toHaveAttribute("aria-checked", "false")
			},
			{ timeout: 2000 },
		)
	}, 20_000)

	test("clicar em 'Ativar' na barra de ações abre o diálogo de confirmação de ativação", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1", status: "suspended" }),
			buildUser({ id: "user-2", status: "suspended" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)

		await user.click(screen.getByRole("button", { name: "Ativar" }))

		expect(
			screen.getByRole("heading", { name: "Confirmar ativação em massa" }),
		).toBeInTheDocument()
	})

	test("confirmar o diálogo chama a mutation com os IDs selecionados e limpa a seleção ao suceder", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1", status: "suspended" }),
			buildUser({ id: "user-2", status: "suspended" }),
		])

		let receivedBody: { userIds?: string[] } = {}
		server.use(
			http.patch(`${apiBaseUrl}/users/bulk-activate`, async ({ request }) => {
				receivedBody = (await request.json()) as { userIds?: string[] }
				return HttpResponse.json(
					{ updated: 2, requested: 2, skipped: 0 },
					{ status: 200 },
				)
			}),
		)

		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		await user.click(
			within(screen.getByTestId("user-row-user-2")).getByRole("checkbox"),
		)

		await user.click(screen.getByRole("button", { name: "Ativar" }))
		await user.click(screen.getByRole("button", { name: "Confirmar ativação" }))

		await waitFor(() => {
			expect(
				screen.queryByRole("heading", {
					name: "Confirmar ativação em massa",
				}),
			).not.toBeInTheDocument()
		})

		expect(receivedBody.userIds?.sort()).toEqual(["user-1", "user-2"])
		expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument()
	})

	test("clicar em 'Limpar seleção' zera a seleção sem abrir nenhum diálogo", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1", status: "suspended" }),
			buildUser({ id: "user-2", status: "suspended" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)

		expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: "Limpar seleção" }))

		expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument()
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "false")
	})
})
