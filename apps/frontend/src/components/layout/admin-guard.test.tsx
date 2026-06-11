import { render, screen } from "@testing-library/react"
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
	usePathname: () => "/admin/usuarios",
}))

import { useAuthStore } from "@/lib/auth/auth-store"
import { AdminGuard } from "./admin-guard"

function setUser(role: "MEMBER" | "ADMIN") {
	useAuthStore.setState({
		accessToken: "token",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

describe("AdminGuard", () => {
	beforeEach(() => {
		replace.mockClear()
		useAuthStore.getState().clear()
	})

	it("renderiza filhos quando role é ADMIN", () => {
		setUser("ADMIN")
		render(
			<AdminGuard>
				<p>painel-admin</p>
			</AdminGuard>,
		)
		expect(screen.getByText("painel-admin")).toBeInTheDocument()
		expect(replace).not.toHaveBeenCalled()
	})

	it("redireciona MEMBER para / e não renderiza filhos", () => {
		setUser("MEMBER")
		render(
			<AdminGuard>
				<p>painel-admin</p>
			</AdminGuard>,
		)
		expect(screen.queryByText("painel-admin")).not.toBeInTheDocument()
		expect(replace).toHaveBeenCalledWith("/")
	})

	it("respeita destino customizado de redirect", () => {
		setUser("MEMBER")
		render(
			<AdminGuard redirectTo="/perfil">
				<p>painel-admin</p>
			</AdminGuard>,
		)
		expect(replace).toHaveBeenCalledWith("/perfil")
	})

	it("exibe placeholder quando não há usuário (boot)", () => {
		render(
			<AdminGuard>
				<p>painel-admin</p>
			</AdminGuard>,
		)
		expect(screen.getByTestId("admin-guard-loading")).toBeInTheDocument()
		expect(screen.queryByText("painel-admin")).not.toBeInTheDocument()
	})
})
