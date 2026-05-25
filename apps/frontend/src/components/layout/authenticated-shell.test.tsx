import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const replace = vi.fn()
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		replace,
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
	usePathname: () => "/inicio",
}))

import { useAuthStore } from "@/lib/auth/auth-store"
import { AuthenticatedShell } from "./authenticated-shell"

function setUser(role: "MEMBER" | "ADMIN" | null) {
	if (role === null) {
		useAuthStore.getState().clear()
		return
	}
	useAuthStore.setState({
		accessToken: "token",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

function renderShell(children: ReactNode = <p>conteúdo</p>) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	})
	return render(
		<QueryClientProvider client={queryClient}>
			<AuthenticatedShell>{children}</AuthenticatedShell>
		</QueryClientProvider>,
	)
}

describe("AuthenticatedShell", () => {
	beforeEach(() => {
		replace.mockClear()
		useAuthStore.getState().clear()
	})

	test("exibe sidebar de navegação com itens principais", () => {
		setUser("MEMBER")
		renderShell()
		const sidebar = screen.getByRole("navigation", {
			name: /navegação principal/i,
		})
		expect(sidebar).toBeInTheDocument()
		expect(sidebar.querySelector('[href="/inicio"]')).toBeInTheDocument()
		expect(sidebar.querySelector('[href="/check-ins"]')).toBeInTheDocument()
		expect(sidebar.querySelector('[href="/academias"]')).toBeInTheDocument()
	})

	test("exibe seção admin na sidebar quando role é ADMIN", () => {
		setUser("ADMIN")
		renderShell()
		const adminNav = screen.getByRole("navigation", { name: /administração/i })
		expect(adminNav).toBeInTheDocument()
		expect(
			adminNav.querySelector('[href="/admin/usuarios"]'),
		).toBeInTheDocument()
	})

	test("oculta seção admin quando role é MEMBER", () => {
		setUser("MEMBER")
		renderShell()
		expect(
			screen.queryByRole("navigation", { name: /administração/i }),
		).not.toBeInTheDocument()
	})

	test("abre e fecha sidebar mobile ao clicar no botão", async () => {
		setUser("MEMBER")
		const user = userEvent.setup()
		renderShell()

		const mobileSidebar = screen.getByTestId("mobile-sidebar")
		expect(mobileSidebar).toHaveAttribute("aria-hidden", "true")

		await user.click(screen.getByRole("button", { name: /abrir menu/i }))
		expect(mobileSidebar).toHaveAttribute("aria-hidden", "false")

		await user.click(screen.getByRole("button", { name: /fechar menu/i }))
		expect(mobileSidebar).toHaveAttribute("aria-hidden", "true")
	})

	test("exibe nome do usuário no rodapé da sidebar (RF-006)", async () => {
		setUser("MEMBER")
		renderShell()
		await waitFor(() => {
			expect(screen.getAllByText("Stub User")[0]).toBeInTheDocument()
		})
	})

	test("sidebar desktop deve ter fundo bg-primary", () => {
		setUser("MEMBER")
		renderShell()
		const sidebar = document.querySelector("aside.hidden")
		expect(sidebar).toHaveClass("bg-primary")
	})

	test("logout redireciona para /login", async () => {
		setUser("MEMBER")
		const user = userEvent.setup()
		renderShell()

		await user.click(screen.getByRole("button", { name: /sair/i }))

		await waitFor(() => {
			expect(replace).toHaveBeenCalledWith("/login")
		})
	})
})
