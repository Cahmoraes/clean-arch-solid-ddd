import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => "/inicio",
}))

vi.mock("@/features/auth/api", () => ({
	useLogout: () => ({ mutate: vi.fn() }),
}))

vi.mock("@/features/profile/api", () => ({
	useMe: () => ({ data: { name: "Caique Moraes" } }),
}))

import { useAuthStore } from "@/lib/auth/auth-store"
import { AuthenticatedShell } from "./authenticated-shell"

function setRole(role: "MEMBER" | "ADMIN") {
	useAuthStore.setState({
		accessToken: "t",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

afterEach(() => useAuthStore.getState().clear())

describe("AuthenticatedShell — VOLT", () => {
	test("exibe a marca VOLT e a navegação principal", () => {
		setRole("MEMBER")
		render(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getAllByText("VOLT").length).toBeGreaterThanOrEqual(1)
		expect(screen.getByRole("link", { name: /Dashboard/ })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /Academias/ })).toBeInTheDocument()
	})

	test("oculta a seção Admin para MEMBER", () => {
		setRole("MEMBER")
		render(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.queryByText("Admin")).not.toBeInTheDocument()
	})

	test("exibe a seção Admin para ADMIN", () => {
		setRole("ADMIN")
		render(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getByText("Admin")).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /Usuários/ })).toBeInTheDocument()
	})

	test("renderiza o toggle de tema na topbar", () => {
		setRole("MEMBER")
		render(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getByRole("button", { name: /tema/i })).toBeInTheDocument()
	})
})
