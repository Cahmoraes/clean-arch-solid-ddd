import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Command } from "cmdk"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { makeTestJwt } from "@/test/render"
import { NavigationGroup } from "./navigation-group"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/",
}))

function renderGroup(role: "MEMBER" | "ADMIN" = "MEMBER", query = "") {
	useAuthStore.getState().setSession(makeTestJwt({ role }))
	return render(
		<Command shouldFilter={false}>
			<Command.List>
				<NavigationGroup query={query} onSelect={vi.fn()} />
			</Command.List>
		</Command>,
	)
}

describe("NavigationGroup", () => {
	beforeEach(() => {
		useAuthStore.getState().clear()
		mockPush.mockClear()
	})

	test("exibe itens de navegação principal para membro", () => {
		renderGroup("MEMBER")
		expect(screen.getByText("Dashboard")).toBeInTheDocument()
		expect(screen.getByText("Academias")).toBeInTheDocument()
		expect(screen.getByText("Check-ins")).toBeInTheDocument()
	})

	test("não exibe itens admin para membro", () => {
		renderGroup("MEMBER")
		expect(screen.queryByText("Usuários (admin)")).not.toBeInTheDocument()
		expect(screen.queryByText("Check-ins (admin)")).not.toBeInTheDocument()
	})

	test("exibe itens admin para ADMIN", () => {
		renderGroup("ADMIN")
		expect(screen.getByText("Usuários (admin)")).toBeInTheDocument()
		expect(screen.getByText("Check-ins (admin)")).toBeInTheDocument()
	})

	test("navega ao clicar num item e chama onSelect", async () => {
		const onSelect = vi.fn()
		useAuthStore.getState().setSession(makeTestJwt({ role: "MEMBER" }))
		render(
			<Command shouldFilter={false}>
				<Command.List>
					<NavigationGroup query="" onSelect={onSelect} />
				</Command.List>
			</Command>,
		)
		await userEvent.click(screen.getByText("Dashboard"))
		expect(mockPush).toHaveBeenCalledWith("/inicio")
		expect(onSelect).toHaveBeenCalledTimes(1)
	})

	test("filtra itens pelo query quando query não está vazia", () => {
		renderGroup("MEMBER", "acad")
		expect(screen.getByText("Academias")).toBeInTheDocument()
		expect(screen.queryByText("Dashboard")).not.toBeInTheDocument()
	})

	test("exibe todos os itens quando query está vazia", () => {
		renderGroup("MEMBER", "")
		expect(screen.getByText("Dashboard")).toBeInTheDocument()
		expect(screen.getByText("Academias")).toBeInTheDocument()
	})

	test("items aparecem sem espera de API (< 50ms percebidos)", () => {
		// Itens estáticos — renderizam sincronamente, sem estado de loading
		renderGroup("MEMBER")
		expect(screen.getByText("Dashboard")).toBeInTheDocument()
	})
})
