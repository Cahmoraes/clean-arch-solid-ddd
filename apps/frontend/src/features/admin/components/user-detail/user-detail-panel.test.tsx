import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { afterEach, describe, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { makeTestJwt } from "@/test/render"
import { UserDetailPanel } from "./user-detail-panel"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "João Damasio",
		email: "joao@example.com",
		role: "ADMIN",
		status: "activated",
		createdAt: "2025-01-12T08:00:00.000Z",
		isSuperAdmin: false,
		...overrides,
	}
}

function renderPanel(user: AdminUser) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>{children}</TooltipProvider>
		</QueryClientProvider>
	)
	return render(<UserDetailPanel user={user} />, { wrapper })
}

describe("UserDetailPanel", () => {
	afterEach(() => {
		useAuthStore.getState().clear()
	})

	test("exibe nome, e-mail e as duas abas", () => {
		renderPanel(buildUser())
		const header = within(screen.getByRole("banner"))
		expect(header.getByText("João Damasio")).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
		expect(
			screen.queryByRole("tab", { name: "Permissões" }),
		).not.toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Atividade" })).toBeInTheDocument()
	})

	test("alterna para a aba Atividade ao clicar", async () => {
		const user = userEvent.setup()
		renderPanel(buildUser())
		await user.click(screen.getByRole("tab", { name: "Atividade" }))
		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("exibe o e-mail no cabeçalho de identidade", () => {
		renderPanel(buildUser())
		const header = within(screen.getByRole("banner"))
		expect(header.getByText("joao@example.com")).toBeInTheDocument()
	})

	test("status Inativo (suspenso) renderiza com ícone semântico (tone danger)", () => {
		renderPanel(buildUser({ status: "suspended" }))
		const header = within(screen.getByRole("banner"))
		const badge = header.getByText("Inativo").closest("span")
		expect(badge).not.toBeNull()
		expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
	})

	test("status Ativo renderiza com ícone semântico (tone success)", () => {
		renderPanel(buildUser({ status: "activated" }))
		const header = within(screen.getByRole("banner"))
		const badge = header.getByText("Ativo").closest("span")
		expect(badge).not.toBeNull()
		expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
		expect(badge as HTMLElement).toHaveClass("text-success")
	})

	test("não exibe o botão Editar dados sem usuário autenticado", () => {
		renderPanel(buildUser({ role: "MEMBER" }))
		expect(
			screen.queryByRole("button", { name: /editar dados/i }),
		).not.toBeInTheDocument()
	})

	test("admin comum exibe o botão Editar dados ao visualizar um membro", () => {
		useAuthStore
			.getState()
			.setSession(
				makeTestJwt({ sub: "admin-id", role: "ADMIN", isSuperAdmin: false }),
			)
		renderPanel(buildUser({ id: "target-id", role: "MEMBER" }))

		expect(
			screen.getByRole("button", { name: /editar dados/i }),
		).toBeInTheDocument()
	})

	test("admin comum não exibe o botão Editar dados ao visualizar o próprio perfil", () => {
		useAuthStore
			.getState()
			.setSession(
				makeTestJwt({ sub: "admin-id", role: "ADMIN", isSuperAdmin: false }),
			)
		renderPanel(buildUser({ id: "admin-id", role: "ADMIN" }))

		expect(
			screen.queryByRole("button", { name: /editar dados/i }),
		).not.toBeInTheDocument()
	})

	test("root abre o formulário de edição ao clicar em Editar dados", async () => {
		const currentUser = userEvent.setup()
		useAuthStore
			.getState()
			.setSession(
				makeTestJwt({ sub: "root-id", role: "ADMIN", isSuperAdmin: true }),
			)
		renderPanel(buildUser({ id: "target-id", role: "MEMBER" }))

		await currentUser.click(
			screen.getByRole("button", { name: /editar dados/i }),
		)

		expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
	})

	test("busca o histórico de atividade ao abrir a aba Atividade e exibe o evento retornado", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, () =>
				HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: new Date().toISOString(),
							},
						],
					},
					{ status: 200 },
				),
			),
		)

		renderPanel(buildUser({ id: "u1" }))
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByText("Login realizado")).toBeInTheDocument()
	})

	test("exibe no máximo 5 eventos e o link para o histórico completo quando há mais de 5", async () => {
		const user = userEvent.setup()
		const events = Array.from({ length: 7 }, (_, index) => ({
			id: `activity-${index + 1}`,
			type: "LOGIN" as const,
			description: `Evento ${index + 1}`,
			occurredAt: new Date().toISOString(),
		}))
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, () =>
				HttpResponse.json(
					{
						events,
						pagination: { page: 1, pageSize: 20, total: 7, totalPages: 1 },
					},
					{ status: 200 },
				),
			),
		)

		renderPanel(buildUser({ id: "u1" }))
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByText("Evento 1")).toBeInTheDocument()
		expect(screen.getByText("Evento 5")).toBeInTheDocument()
		expect(screen.queryByText("Evento 6")).not.toBeInTheDocument()
		expect(screen.queryByText("Evento 7")).not.toBeInTheDocument()

		const link = screen.getByRole("link", { name: "Ver histórico completo" })
		expect(link).toHaveAttribute("href", "/admin/usuarios/u1/atividade")
	})

	test("não exibe o link para o histórico completo quando há 5 eventos ou menos", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, () =>
				HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: new Date().toISOString(),
							},
						],
						pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
					},
					{ status: 200 },
				),
			),
		)

		renderPanel(buildUser({ id: "u1" }))
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByText("Login realizado")).toBeInTheDocument()
		expect(
			screen.queryByRole("link", { name: "Ver histórico completo" }),
		).not.toBeInTheDocument()
	})

	test("exibe mensagem de erro (não o estado vazio) quando a busca de atividade falha", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, () =>
				HttpResponse.json({ message: "Internal error" }, { status: 500 }),
			),
		)

		renderPanel(buildUser({ id: "u1" }))
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(
			await screen.findByText(
				"Não foi possível carregar o histórico de atividade.",
			),
		).toBeInTheDocument()
	})
})
