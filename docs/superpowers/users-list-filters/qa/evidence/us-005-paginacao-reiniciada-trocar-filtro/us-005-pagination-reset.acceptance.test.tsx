import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, test } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminUsersPage from "@/app/(authenticated)/admin/usuarios/page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function buildUser(id = "user-1") {
	return {
		id,
		name: `User ${id}`,
		email: `${id}@example.com`,
		role: "MEMBER" as const,
		status: "activated" as const,
		createdAt: "2024-01-01T00:00:00.000Z",
	}
}

function mockUsersEndpoint(
	onRequest?: (page: string, filter: string | null) => void,
) {
	server.use(
		http.get(`${apiBaseUrl}/users`, ({ request }) => {
			const url = new URL(request.url)
			const page = url.searchParams.get("page") ?? "1"
			const filter =
				url.searchParams.get("role") ?? url.searchParams.get("status") ?? null
			onRequest?.(page, filter)
			return HttpResponse.json(
				{
					users: [buildUser()],
					pagination: { page: Number(page), limit: 10, total: 30 },
				},
				{ status: 200 },
			)
		}),
		http.get(`${apiBaseUrl}/users/stats`, () =>
			HttpResponse.json(
				{ total: 30, members: 25, admins: 5, active: 28, inactive: 2 },
				{ status: 200 },
			),
		),
	)
}

describe("US-005 — RF-012: paginação reiniciada ao trocar de filtro", () => {
	beforeEach(() => {
		useAuthStore.setState({
			accessToken: "token",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-id", role: "ADMIN" },
		})
	})

	test("deve enviar page=1 na requisição após trocar de filtro quando estava em página maior", async () => {
		const receivedPages: string[] = []
		const user = userEvent.setup()

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				receivedPages.push(url.searchParams.get("page") ?? "1")
				return HttpResponse.json(
					{
						users: [buildUser()],
						pagination: { page: Number(url.searchParams.get("page") ?? "1"), limit: 10, total: 30 },
					},
					{ status: 200 },
				)
			}),
			http.get(`${apiBaseUrl}/users/stats`, () =>
				HttpResponse.json(
					{ total: 30, members: 25, admins: 5, active: 28, inactive: 2 },
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<AdminUsersPage />)

		// Aguarda lista renderizar na página 1
		await waitFor(() =>
			expect(screen.getByTestId("admin-users-list")).toBeInTheDocument(),
		)

		// Navega para página 2
		await user.click(screen.getByTestId("admin-users-next"))
		await waitFor(() => expect(receivedPages).toContain("2"))

		// Troca filtro para "Membros"
		const membrosBtn = screen.getByRole("button", { name: /membros/i })
		await user.click(membrosBtn)

		// Após troca de filtro, deve enviar page=1
		await waitFor(() => {
			const lastPage = receivedPages.at(-1)
			expect(lastPage).toBe("1")
		})
	})

	test("deve enviar page=1 imediatamente ao clicar em qualquer filtro (independente de navegação prévia)", async () => {
		const requests: Array<{ page: string; role: string | null }> = []
		const user = userEvent.setup()

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				requests.push({
					page: url.searchParams.get("page") ?? "1",
					role: url.searchParams.get("role"),
				})
				return HttpResponse.json(
					{
						users: [buildUser()],
						pagination: { page: 1, limit: 10, total: 10 },
					},
					{ status: 200 },
				)
			}),
			http.get(`${apiBaseUrl}/users/stats`, () =>
				HttpResponse.json(
					{ total: 10, members: 8, admins: 2, active: 9, inactive: 1 },
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<AdminUsersPage />)

		await waitFor(() =>
			expect(screen.getByTestId("admin-users-list")).toBeInTheDocument(),
		)

		// Clica no filtro "Administradores"
		await user.click(screen.getByRole("button", { name: /administradores/i }))

		await waitFor(() => {
			const filterRequest = requests.find((r) => r.role === "ADMIN")
			expect(filterRequest).toBeDefined()
			expect(filterRequest?.page).toBe("1")
		})
	})

	test("deve enviar page=1 ao trocar entre filtros diferentes consecutivamente", async () => {
		const requests: Array<{ page: string }> = []
		const user = userEvent.setup()

		mockUsersEndpoint((page) => requests.push({ page }))

		renderWithProviders(<AdminUsersPage />)

		await waitFor(() =>
			expect(screen.getByTestId("admin-users-list")).toBeInTheDocument(),
		)

		// Troca para "Ativos"
		await user.click(screen.getByRole("button", { name: /^ativos/i }))
		await waitFor(() => expect(requests.length).toBeGreaterThan(1))

		// Troca para "Inativos"
		await user.click(screen.getByRole("button", { name: /^inativos/i }))
		await waitFor(() => expect(requests.length).toBeGreaterThan(2))

		// Todas as requisições por troca de filtro devem ser page=1
		const filterRequests = requests.slice(1)
		for (const req of filterRequests) {
			expect(req.page).toBe("1")
		}
	})
})
