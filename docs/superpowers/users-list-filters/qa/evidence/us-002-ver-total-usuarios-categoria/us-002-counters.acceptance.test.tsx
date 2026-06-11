/**
 * Acceptance test — US-002 / RF-004
 *
 * Verifica que os contadores de categoria são independentes da paginação:
 * vêm exclusivamente de GET /users/stats e não dos itens retornados por
 * GET /users.
 */
import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, test } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminUsersPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const STATS = {
	total: 120,
	members: 100,
	admins: 20,
	active: 110,
	inactive: 10,
}

/** Página retorna apenas 1 usuário (página 1 de N), mas stats mostra totais reais */
function mockBothEndpoints() {
	server.use(
		http.get(`${apiBaseUrl}/users/stats`, () =>
			HttpResponse.json(STATS, { status: 200 }),
		),
		http.get(`${apiBaseUrl}/users`, ({ request }) => {
			const url = new URL(request.url)
			const page = Number(url.searchParams.get("page") ?? "1")
			const limit = Number(url.searchParams.get("limit") ?? "10")
			return HttpResponse.json(
				{
					users: [
						{
							id: "user-1",
							name: "Ana Silva",
							email: "ana@example.com",
							role: "MEMBER" as const,
							status: "activated" as const,
							createdAt: "2024-01-15T12:00:00.000Z",
						},
					],
					pagination: { page, limit, total: 120 },
				},
				{ status: 200 },
			)
		}),
	)
}

describe("US-002 / RF-004 — contadores independentes da paginação", () => {
	beforeEach(() => {
		useAuthStore.setState({
			accessToken: "token",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-logged", role: "ADMIN" },
		})
	})

	test("exibe contadores do endpoint /users/stats independentemente dos itens paginados", async () => {
		mockBothEndpoints()
		renderWithProviders(<AdminUsersPage />)

		// Aguarda a lista (GET /users) carregar
		await waitFor(() => {
			expect(screen.getByTestId("admin-users-list")).toBeInTheDocument()
		})

		// Contadores devem refletir STATS (totais reais), não o 1 usuário da página
		expect(screen.getByText(String(STATS.total))).toBeInTheDocument()
		expect(screen.getByText(String(STATS.members))).toBeInTheDocument()
		expect(screen.getByText(String(STATS.admins))).toBeInTheDocument()
		expect(screen.getByText(String(STATS.active))).toBeInTheDocument()
		expect(screen.getByText(String(STATS.inactive))).toBeInTheDocument()
	})

	test("os dois endpoints são chamados de forma independente ao carregar a página", async () => {
		let statsCallCount = 0
		let usersCallCount = 0

		server.use(
			http.get(`${apiBaseUrl}/users/stats`, () => {
				statsCallCount++
				return HttpResponse.json(STATS, { status: 200 })
			}),
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				const page = Number(url.searchParams.get("page") ?? "1")
				const limit = Number(url.searchParams.get("limit") ?? "10")
				usersCallCount++
				return HttpResponse.json(
					{
						users: [],
						pagination: { page, limit, total: 120 },
					},
					{ status: 200 },
				)
			}),
		)

		renderWithProviders(<AdminUsersPage />)

		await waitFor(() => {
			expect(statsCallCount).toBeGreaterThanOrEqual(1)
			expect(usersCallCount).toBeGreaterThanOrEqual(1)
		})
	})
})
