import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminUsersPage from "@/app/(authenticated)/admin/usuarios/page"

// US-02 (FR-003, FR-004): "Como administrador, eu quero buscar por nome ou
// e-mail para que eu localize um usuário específico sem percorrer toda a
// lista." As demais suítes já cobrem o envio do query param e o debounce de
// 500ms (admin-users-page.test.tsx). Este arquivo cobre as duas asserções
// da FR-003/FR-004 que ficaram sem teste dedicado:
//   1. FR-003: buscar a partir de uma página > 1 reinicia a paginação para 1.
//   2. FR-004: abrir o detalhe de um usuário não altera a query/filtro ativos
//      (o mesmo texto de busca continua no campo e a lista filtrada persiste).

vi.mock("next/navigation", () => ({
	useSearchParams: vi.fn(),
}))

vi.mock("@/lib/hooks/use-is-desktop", () => ({
	useIsDesktop: () => true,
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

function renderPage() {
	return renderWithProviders(<AdminUsersPage />)
}

describe("US-02 — buscar por nome ou e-mail (FR-003, FR-004)", () => {
	beforeEach(() => {
		useAuthStore.setState({
			accessToken: "token",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-logged", role: "ADMIN" },
		})
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("") as unknown as ReturnType<typeof useSearchParams>,
		)
	})

	test("FR-003: buscar a partir da página 2 reinicia a paginação para a página 1", async () => {
		const user = userEvent.setup()
		const allUsers = buildManyUsers(11)
		let receivedPage = 1
		let receivedQuery: string | null = null

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				const page = Number(url.searchParams.get("page") ?? "1")
				const limit = Number(url.searchParams.get("limit") ?? "10")
				const query = url.searchParams.get("query")
				receivedPage = page
				receivedQuery = query
				const matching = query
					? allUsers.filter((candidate) =>
							candidate.name.toLowerCase().includes(query.toLowerCase()),
						)
					: allUsers
				const start = (page - 1) * limit
				const pageUsers = matching.slice(start, start + limit)
				return HttpResponse.json(
					{
						users: pageUsers,
						pagination: { page, limit, total: matching.length },
					},
					{ status: 200 },
				)
			}),
		)

		renderPage()

		await screen.findByTestId("user-row-user-1")

		// Vai para a página 2 (sem busca ativa).
		await user.click(screen.getByTestId("admin-users-page-2"))
		await waitFor(() => {
			expect(receivedPage).toBe(2)
		})
		await screen.findByTestId("user-row-user-11")

		// Digita uma busca: a FR-003 exige reiniciar a paginação para 1.
		await user.type(screen.getByTestId("admin-users-search"), "Usuário 1")

		await waitFor(
			() => {
				expect(receivedQuery).toBe("Usuário 1")
			},
			{ timeout: 2000 },
		)
		expect(receivedPage).toBe(1)
	}, 20_000)

	test("FR-004: abrir o detalhe de um usuário preserva a busca e o filtro ativos", async () => {
		const user = userEvent.setup()

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				const query = url.searchParams.get("query")
				const role = url.searchParams.get("role")
				let users = [
					buildUser({ id: "user-1", name: "Ana Silva", email: "ana@example.com" }),
					buildUser({
						id: "user-2",
						name: "Carlos Lima",
						email: "carlos@example.com",
						role: "ADMIN",
					}),
				]
				if (query) {
					users = users.filter((candidate) =>
						candidate.name.toLowerCase().includes(query.toLowerCase()),
					)
				}
				if (role) {
					users = users.filter((candidate) => candidate.role === role)
				}
				return HttpResponse.json(
					{ users, pagination: { page: 1, limit: 10, total: users.length } },
					{ status: 200 },
				)
			}),
		)

		renderPage()

		await screen.findByTestId("user-row-user-1")
		await user.click(
			screen.getByRole("button", { name: /administradores/i }),
		)
		await waitFor(() => {
			expect(screen.queryByTestId("user-row-user-1")).not.toBeInTheDocument()
		})
		await screen.findByTestId("user-row-user-2")

		await user.type(screen.getByTestId("admin-users-search"), "Carlos")
		await waitFor(() => {
			expect(
				(screen.getByTestId("admin-users-search") as HTMLInputElement).value,
			).toBe("Carlos")
		})

		// Abre o detalhe do usuário — a FR-004 exige que filtro/busca
		// continuem intactos enquanto o administrador consulta o detalhe.
		await user.click(
			within(screen.getByTestId("user-row-user-2")).getByRole("button"),
		)
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
		})

		expect(
			(screen.getByTestId("admin-users-search") as HTMLInputElement).value,
		).toBe("Carlos")
		expect(
			screen.getByRole("button", { name: /administradores/i }),
		).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByTestId("user-row-user-2")).toBeInTheDocument()
	}, 20_000)
})
