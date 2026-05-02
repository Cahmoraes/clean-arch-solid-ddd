import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement, ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

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
	usePathname: () => "/perfil",
}))

import { useAuthStore } from "@/lib/auth/auth-store"
import { AuthenticatedShell } from "./AuthenticatedShell"

function setUser(role: "MEMBER" | "ADMIN" | null) {
	const store = useAuthStore.getState()
	if (role === null) {
		store.clear()
		return
	}
	useAuthStore.setState({
		accessToken: "token",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

function renderShell(children: ReactNode = <p>conteúdo</p>): {
	queryClient: QueryClient
	rerender: (ui: ReactElement) => void
} {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
	const utils = render(
		<QueryClientProvider client={queryClient}>
			<AuthenticatedShell>{children}</AuthenticatedShell>
		</QueryClientProvider>,
	)
	return { queryClient, rerender: utils.rerender }
}

describe("AuthenticatedShell", () => {
	beforeEach(() => {
		replace.mockClear()
		useAuthStore.getState().clear()
	})

	it("exibe link admin quando role é ADMIN", () => {
		setUser("ADMIN")
		renderShell()
		const desktopNav = screen.getByRole("navigation", {
			name: /navegação principal/i,
		})
		expect(within(desktopNav).getByText("Admin")).toBeInTheDocument()
	})

	it("oculta link admin quando role é MEMBER", () => {
		setUser("MEMBER")
		renderShell()
		const desktopNav = screen.getByRole("navigation", {
			name: /navegação principal/i,
		})
		expect(within(desktopNav).queryByText("Admin")).not.toBeInTheDocument()
		expect(within(desktopNav).getByText("Perfil")).toBeInTheDocument()
	})

	it("alterna o menu mobile ao clicar no botão", async () => {
		setUser("MEMBER")
		const user = userEvent.setup()
		renderShell()

		expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument()

		const toggle = screen.getByRole("button", {
			name: /abrir menu de navegação/i,
		})
		await user.click(toggle)

		const mobileNav = screen.getByTestId("mobile-nav")
		expect(mobileNav).toBeInTheDocument()
		expect(within(mobileNav).getByText("Perfil")).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /fechar menu/i }))
		expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument()
	})

	it("logout limpa o store e redireciona para /login", async () => {
		setUser("MEMBER")
		const user = userEvent.setup()
		renderShell()

		await user.click(screen.getByRole("button", { name: /menu de usuário/i }))
		await user.click(await screen.findByRole("menuitem", { name: /sair/i }))

		await waitFor(() => {
			expect(useAuthStore.getState().accessToken).toBeNull()
			expect(replace).toHaveBeenCalledWith("/login")
		})
	})
})
