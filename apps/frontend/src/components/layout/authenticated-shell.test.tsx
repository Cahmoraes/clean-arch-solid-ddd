import { fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

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

vi.mock("@/components/notification/notification-bell", () => ({
	NotificationBell: () => <button type="button" aria-label="Notificações" />,
}))

import { useAuthStore } from "@/lib/auth/auth-store"
import { useSidebarCollapseStore } from "@/lib/ui-state/sidebar-collapse-store"
import { renderWithProviders } from "@/test/render"
import { AuthenticatedShell } from "./authenticated-shell"

function setRole(role: "MEMBER" | "ADMIN") {
	useAuthStore.setState({
		accessToken: "t",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

afterEach(() => useAuthStore.getState().clear())
beforeEach(() => useSidebarCollapseStore.setState({ collapsed: false }))

describe("AuthenticatedShell — VOLT", () => {
	test("exibe a marca VOLT e a navegação principal", () => {
		setRole("MEMBER")
		renderWithProviders(
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
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.queryByText("Admin")).not.toBeInTheDocument()
	})

	test("exibe a seção Admin para ADMIN", () => {
		setRole("ADMIN")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getByText("Admin")).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /Usuários/ })).toBeInTheDocument()
	})

	test("renderiza o toggle de tema na topbar", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getByRole("button", { name: /modo/i })).toBeInTheDocument()
	})

	test("exibe o botão Sair na sidebar para MEMBER", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument()
	})
})

describe("AuthenticatedShell — recolher/expandir", () => {
	test("inicia expandido com toggle 'Recolher menu' e aria-expanded=true", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const toggle = screen.getByRole("button", { name: "Recolher menu" })
		expect(toggle).toHaveAttribute("aria-expanded", "true")
	})

	test("clicar no toggle recolhe e inverte aria/label", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		fireEvent.click(screen.getByRole("button", { name: "Recolher menu" }))
		const toggle = screen.getByRole("button", { name: "Expandir menu" })
		expect(toggle).toHaveAttribute("aria-expanded", "false")
	})

	test("inicia recolhido quando defaultCollapsed=true", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell defaultCollapsed>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(
			screen.getByRole("button", { name: "Expandir menu" }),
		).toBeInTheDocument()
	})

	test("preserva o nome acessível dos itens quando recolhido (FR-008)", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell defaultCollapsed>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument()
	})

	test("Cmd/Ctrl+B alterna o recolhimento (FR-011)", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		fireEvent.keyDown(window, { key: "b", ctrlKey: true })
		expect(
			screen.getByRole("button", { name: "Expandir menu" }),
		).toBeInTheDocument()
	})
})
