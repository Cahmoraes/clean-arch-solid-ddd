/**
 * Acceptance tests for US-03 — Reconhecimento do meu perfil
 *
 * Verifies RF-009 and RF-010 for ProfileHeroCard component:
 * - RF-009: Avatar com iniciais, nome, email, role, data de cadastro
 * - RF-010: Badge de status (Ativo/Inativo) com cor correspondente
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { ProfileHeroCard } from "@/features/dashboard/components/profile-hero-card"
import { server } from "@/test/msw/server"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

function renderProfileHeroCard() {
	return render(<ProfileHeroCard thisMonth={3} streak={5} />, {
		wrapper: makeWrapper(),
	})
}

describe("US-03 — Reconhecimento do meu perfil: ProfileHeroCard", () => {
	describe("getInitials (RF-009 — avatar com iniciais do nome)", () => {
		test("deve extrair iniciais de nome composto", () => {
			// getInitials is internal — validated indirectly via rendered avatar
			server.use(
				http.get(`${apiBaseUrl}/users/me`, () =>
					HttpResponse.json(
						{
							id: "u-1",
							name: "João Silva",
							email: "joao@example.com",
							role: "MEMBER",
							hasPassword: true,
							authMethods: ["password"],
							createdAt: "2024-01-15T10:30:00.000Z",
							status: "activated",
						},
						{ status: 200 },
					),
				),
				http.get(`${apiBaseUrl}/users/me/metrics`, () =>
					HttpResponse.json({ checkInsCount: 10 }, { status: 200 }),
				),
			)

			renderProfileHeroCard()

			return waitFor(() => {
				// Avatar shows initials "JS" for "João Silva"
				expect(screen.getByText("JS")).toBeInTheDocument()
			})
		})

		test("deve extrair iniciais de nome com uma única palavra", () => {
			server.use(
				http.get(`${apiBaseUrl}/users/me`, () =>
					HttpResponse.json(
						{
							id: "u-2",
							name: "Carlos",
							email: "carlos@example.com",
							role: "MEMBER",
							hasPassword: true,
							authMethods: ["password"],
							createdAt: "2024-03-01T08:00:00.000Z",
							status: "activated",
						},
						{ status: 200 },
					),
				),
				http.get(`${apiBaseUrl}/users/me/metrics`, () =>
					HttpResponse.json({ checkInsCount: 2 }, { status: 200 }),
				),
			)

			renderProfileHeroCard()

			return waitFor(() => {
				expect(screen.getByText("C")).toBeInTheDocument()
			})
		})
	})

	describe("RF-009 — exibição de nome, email e data de cadastro", () => {
		test("deve exibir nome completo do membro", () => {
			server.use(
				http.get(`${apiBaseUrl}/users/me`, () =>
					HttpResponse.json(
						{
							id: "u-3",
							name: "Maria Fernanda",
							email: "maria@example.com",
							role: "MEMBER",
							hasPassword: true,
							authMethods: ["password"],
							createdAt: "2024-06-10T12:00:00.000Z",
							status: "activated",
						},
						{ status: 200 },
					),
				),
				http.get(`${apiBaseUrl}/users/me/metrics`, () =>
					HttpResponse.json({ checkInsCount: 5 }, { status: 200 }),
				),
			)

			renderProfileHeroCard()

			return waitFor(() => {
				expect(screen.getByText("Maria Fernanda")).toBeInTheDocument()
			})
		})

		test("deve exibir email do membro", () => {
			server.use(
				http.get(`${apiBaseUrl}/users/me`, () =>
					HttpResponse.json(
						{
							id: "u-4",
							name: "Pedro Costa",
							email: "pedro@example.com",
							role: "MEMBER",
							hasPassword: true,
							authMethods: ["password"],
							createdAt: "2024-02-20T09:00:00.000Z",
							status: "activated",
						},
						{ status: 200 },
					),
				),
				http.get(`${apiBaseUrl}/users/me/metrics`, () =>
					HttpResponse.json({ checkInsCount: 0 }, { status: 200 }),
				),
			)

			renderProfileHeroCard()

			return waitFor(() => {
				expect(screen.getByText("pedro@example.com")).toBeInTheDocument()
			})
		})

		test("deve exibir data de cadastro formatada em português", () => {
			server.use(
				http.get(`${apiBaseUrl}/users/me`, () =>
					HttpResponse.json(
						{
							id: "u-5",
							name: "Ana Lima",
							email: "ana@example.com",
							role: "MEMBER",
							hasPassword: true,
							authMethods: ["password"],
							createdAt: "2024-01-15T10:30:00.000Z",
							status: "activated",
						},
						{ status: 200 },
					),
				),
				http.get(`${apiBaseUrl}/users/me/metrics`, () =>
					HttpResponse.json({ checkInsCount: 0 }, { status: 200 }),
				),
			)

			renderProfileHeroCard()

			return waitFor(() => {
				// "Membro desde" prefix + formatted date in pt-BR
				const memberSinceEl = screen.getByText(/membro desde/i)
				expect(memberSinceEl).toBeInTheDocument()
				// Should contain "jan." or "jan" (pt-BR short month)
				expect(memberSinceEl.textContent).toMatch(/jan/i)
				// Should contain the year
				expect(memberSinceEl.textContent).toContain("2024")
			})
		})

		test("não deve exibir data quando createdAt está ausente", () => {
			server.use(
				http.get(`${apiBaseUrl}/users/me`, () =>
					HttpResponse.json(
						{
							id: "u-6",
							name: "Sem Data",
							email: "semdata@example.com",
							role: "MEMBER",
							hasPassword: false,
							authMethods: [],
						},
						{ status: 200 },
					),
				),
				http.get(`${apiBaseUrl}/users/me/metrics`, () =>
					HttpResponse.json({ checkInsCount: 0 }, { status: 200 }),
				),
			)

			renderProfileHeroCard()

			return waitFor(() => {
				expect(screen.queryByText(/membro desde/i)).not.toBeInTheDocument()
			})
		})
	})

	describe("RF-010 — badge de status com cor correspondente", () => {
		test("deve exibir badge verde 'Conta ativa' para status activated", () => {
			server.use(
				http.get(`${apiBaseUrl}/users/me`, () =>
					HttpResponse.json(
						{
							id: "u-7",
							name: "Ativo User",
							email: "ativo@example.com",
							role: "MEMBER",
							hasPassword: true,
							authMethods: ["password"],
							createdAt: "2024-05-01T00:00:00.000Z",
							status: "activated",
						},
						{ status: 200 },
					),
				),
				http.get(`${apiBaseUrl}/users/me/metrics`, () =>
					HttpResponse.json({ checkInsCount: 0 }, { status: 200 }),
				),
			)

			renderProfileHeroCard()

			return waitFor(() => {
				const badge = screen.getByText("Conta ativa")
				expect(badge).toBeInTheDocument()
				// Badge container should have green classes
				const badgeContainer = badge.closest("span")
				expect(badgeContainer?.className).toMatch(/green/)
			})
		})

		test("deve exibir badge vermelho 'Conta suspensa' para status suspended", () => {
			server.use(
				http.get(`${apiBaseUrl}/users/me`, () =>
					HttpResponse.json(
						{
							id: "u-8",
							name: "Suspenso User",
							email: "suspenso@example.com",
							role: "MEMBER",
							hasPassword: true,
							authMethods: ["password"],
							createdAt: "2024-05-01T00:00:00.000Z",
							status: "suspended",
						},
						{ status: 200 },
					),
				),
				http.get(`${apiBaseUrl}/users/me/metrics`, () =>
					HttpResponse.json({ checkInsCount: 0 }, { status: 200 }),
				),
			)

			renderProfileHeroCard()

			return waitFor(() => {
				const badge = screen.getByText("Conta suspensa")
				expect(badge).toBeInTheDocument()
				// Badge container should have red classes
				const badgeContainer = badge.closest("span")
				expect(badgeContainer?.className).toMatch(/red/)
			})
		})

		test("deve exibir badge vermelho quando status está ausente (padrão inativo)", () => {
			server.use(
				http.get(`${apiBaseUrl}/users/me`, () =>
					HttpResponse.json(
						{
							id: "u-9",
							name: "Sem Status",
							email: "semstatus@example.com",
							role: "MEMBER",
							hasPassword: false,
							authMethods: [],
						},
						{ status: 200 },
					),
				),
				http.get(`${apiBaseUrl}/users/me/metrics`, () =>
					HttpResponse.json({ checkInsCount: 0 }, { status: 200 }),
				),
			)

			renderProfileHeroCard()

			return waitFor(() => {
				// When status is undefined, isActive = false → "Conta suspensa"
				const badge = screen.getByText("Conta suspensa")
				expect(badge).toBeInTheDocument()
				const badgeContainer = badge.closest("span")
				expect(badgeContainer?.className).toMatch(/red/)
			})
		})
	})
})
