import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { makeTestJwt, renderWithProviders } from "@/test/render"
import { CommandPalette } from "./command-palette"

describe("CommandPalette", () => {
	test("não renderiza o input quando open=false", () => {
		renderWithProviders(<CommandPalette open={false} onOpenChange={vi.fn()} />)
		expect(
			screen.queryByPlaceholderText("Buscar páginas, academias, usuários..."),
		).not.toBeInTheDocument()
	})

	test("renderiza o input quando open=true", () => {
		renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
		expect(
			screen.getByPlaceholderText("Buscar páginas, academias, usuários..."),
		).toBeInTheDocument()
	})

	test("chama onOpenChange(false) ao pressionar Esc", async () => {
		const onOpenChange = vi.fn()
		renderWithProviders(
			<CommandPalette open={true} onOpenChange={onOpenChange} />,
		)
		await userEvent.keyboard("{Escape}")
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	test("exibe mensagem de resultado vazio quando query não tem resultados", async () => {
		useAuthStore.getState().setSession(makeTestJwt({ role: "MEMBER" }))
		renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
		await userEvent.type(
			screen.getByPlaceholderText("Buscar páginas, academias, usuários..."),
			"zzzzzzz",
		)
		await waitFor(
			() =>
				expect(
					screen.getByText("Nenhum resultado encontrado."),
				).toBeInTheDocument(),
			{ timeout: 1000 },
		)
	})

	test("exibe NavigationGroup quando aberto com query vazia (membro)", async () => {
		useAuthStore.getState().setSession(makeTestJwt({ role: "MEMBER" }))
		renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
		expect(await screen.findByText("Dashboard")).toBeInTheDocument()
		expect(screen.queryByText("Usuários (admin)")).not.toBeInTheDocument()
	})

	test("exibe NavigationGroup com itens admin quando ADMIN", async () => {
		useAuthStore.getState().setSession(makeTestJwt({ role: "ADMIN" }))
		renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
		expect(await screen.findByText("Usuários (admin)")).toBeInTheDocument()
	})

	test("exibe GymGroup após digitar 2+ chars", async () => {
		server.use(
			http.get("*/gyms/search/:name", () =>
				HttpResponse.json([
					{
						id: "1",
						title: "Academia Power",
						description: "",
						phone: "",
						latitude: 0,
						longitude: 0,
					},
				]),
			),
		)
		useAuthStore.getState().setSession(makeTestJwt({ role: "MEMBER" }))
		renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
		await userEvent.type(
			screen.getByPlaceholderText("Buscar páginas, academias, usuários..."),
			"ac",
		)
		await waitFor(
			() => expect(screen.getByText("Academia Power")).toBeInTheDocument(),
			{ timeout: 1000 },
		)
	})

	test("não exibe UserGroup para membro", async () => {
		server.use(
			http.get("*/users", () =>
				HttpResponse.json({
					users: [
						{
							id: "1",
							name: "João",
							email: "j@t.com",
							role: "MEMBER",
							status: "active",
						},
					],
					pagination: {},
				}),
			),
		)
		useAuthStore.getState().setSession(makeTestJwt({ role: "MEMBER" }))
		renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
		await userEvent.type(
			screen.getByPlaceholderText("Buscar páginas, academias, usuários..."),
			"jo",
		)
		await waitFor(() =>
			expect(screen.queryByText("João")).not.toBeInTheDocument(),
		)
	})
})
