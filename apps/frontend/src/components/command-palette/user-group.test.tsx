import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Command } from "cmdk"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { makeTestJwt, renderWithProviders } from "@/test/render"
import { UserGroup } from "./user-group"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/",
}))

function renderUserGroup(
	query: string,
	role: "MEMBER" | "ADMIN" = "ADMIN",
	isActive = query.trim().length >= 2,
) {
	useAuthStore.getState().setSession(makeTestJwt({ role }))
	return renderWithProviders(
		<Command shouldFilter={false}>
			<Command.List>
				<UserGroup query={query} isActive={isActive} onSelect={vi.fn()} />
			</Command.List>
		</Command>,
	)
}

describe("UserGroup", () => {
	beforeEach(() => {
		useAuthStore.getState().clear()
		mockPush.mockClear()
	})

	test("não exibe nada quando isActive=false", () => {
		renderUserGroup("jo", "ADMIN", false)
		expect(screen.queryByText("Usuários")).not.toBeInTheDocument()
	})

	test("exibe skeleton enquanto carrega", async () => {
		server.use(
			http.get("*/users", async () => {
				await new Promise((r) => setTimeout(r, 100))
				return HttpResponse.json({ users: [], pagination: {} })
			}),
		)
		renderUserGroup("joao")
		expect(screen.getByTestId("user-group-loading")).toBeInTheDocument()
	})

	test("exibe usuários retornados pela API", async () => {
		server.use(
			http.get("*/users", () =>
				HttpResponse.json({
					users: [
						{
							id: "1",
							name: "João Silva",
							email: "joao@test.com",
							role: "MEMBER",
							status: "active",
						},
						{
							id: "2",
							name: "Joana Faria",
							email: "joana@test.com",
							role: "ADMIN",
							status: "active",
						},
					],
					pagination: { total: 2, page: 1, limit: 5, totalPages: 1 },
				}),
			),
		)
		renderUserGroup("joao")
		await waitFor(() =>
			expect(screen.getByText("João Silva")).toBeInTheDocument(),
		)
		expect(screen.getByText("Joana Faria")).toBeInTheDocument()
	})

	test("exibe estado vazio quando API retorna lista vazia", async () => {
		server.use(
			http.get("*/users", () =>
				HttpResponse.json({
					users: [],
					pagination: { total: 0, page: 1, limit: 5, totalPages: 0 },
				}),
			),
		)
		renderUserGroup("xxxx")
		await waitFor(() =>
			expect(
				screen.getByText("Nenhum usuário encontrado."),
			).toBeInTheDocument(),
		)
	})

	test("navega para /admin/usuarios com userId e query ao selecionar", async () => {
		const onSelect = vi.fn()
		server.use(
			http.get("*/users", () =>
				HttpResponse.json({
					users: [
						{
							id: "usr-1",
							name: "João Silva",
							email: "joao@test.com",
							role: "MEMBER",
							status: "active",
						},
					],
					pagination: { total: 1, page: 1, limit: 5, totalPages: 1 },
				}),
			),
		)
		useAuthStore.getState().setSession(makeTestJwt({ role: "ADMIN" }))
		renderWithProviders(
			<Command shouldFilter={false}>
				<Command.List>
					<UserGroup query="joao" isActive={true} onSelect={onSelect} />
				</Command.List>
			</Command>,
		)
		await waitFor(() => screen.getByText("João Silva"))
		await userEvent.click(screen.getByText("João Silva"))
		expect(mockPush).toHaveBeenCalledWith(
			"/admin/usuarios?userId=usr-1&query=Jo%C3%A3o+Silva",
		)
		expect(onSelect).toHaveBeenCalledTimes(1)
	})
})
