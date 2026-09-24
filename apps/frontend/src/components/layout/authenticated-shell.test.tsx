import { fireEvent, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => mockedPathname,
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

let mockedPathname = "/inicio"

function setPathname(pathname: string) {
	mockedPathname = pathname
}

function setRole(role: "MEMBER" | "ADMIN") {
	useAuthStore.setState({
		accessToken: "t",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

beforeEach(() => {
	useAuthStore.getState().clear()
	useSidebarCollapseStore.setState({ collapsed: false })
	mockedPathname = "/inicio"
})

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
		expect(screen.getByRole("link", { name: "Calendário" })).toBeInTheDocument()
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

	test("renderiza as duas instâncias do toggle de tema (completa e compacta) na topbar", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getAllByRole("button", { name: /modo/i })).toHaveLength(2)
	})

	test("renderiza duas instâncias de busca (completa e compacta) na topbar", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getAllByRole("button", { name: "Buscar" })).toHaveLength(2)
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

	test("aponta Calendário para a rota autenticada correta", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getByRole("link", { name: "Calendário" })).toHaveAttribute(
			"href",
			"/calendario",
		)
	})

	test("marca Calendário como ativo na rota de calendário", () => {
		setRole("MEMBER")
		setPathname("/calendario")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(screen.getByRole("link", { name: "Calendário" })).toHaveAttribute(
			"aria-current",
			"page",
		)
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
		expect(screen.getByRole("link", { name: "Calendário" })).toBeInTheDocument()
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

	test("Cmd/Ctrl+K abre o command palette sem recolher o menu (FR-011)", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		fireEvent.keyDown(window, { key: "k", ctrlKey: true })
		expect(
			screen.getByRole("dialog", { name: "Paleta de comandos" }),
		).toBeInTheDocument()
		expect(useSidebarCollapseStore.getState().collapsed).toBe(false)
	})
})

describe("AuthenticatedShell — skip-link", () => {
	test("exibe skip-link para o conteúdo principal", () => {
		setRole("MEMBER")
		const { container } = renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const skipLink = screen.getByRole("link", {
			name: "Pular para o conteúdo principal",
		})
		expect(skipLink).toHaveAttribute("href", "#main-content")
		expect(container.querySelector("#main-content")).toBeInTheDocument()
	})
})

describe("AuthenticatedShell — item Novo aviso", () => {
	test("ADMIN vê o link Novo aviso apontando para /admin/avisos/novo", () => {
		setRole("ADMIN")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)

		expect(screen.getByRole("link", { name: "Novo aviso" })).toHaveAttribute(
			"href",
			"/admin/avisos/novo",
		)
	})

	test("o link fica ativo em /admin/avisos/novo", () => {
		setRole("ADMIN")
		setPathname("/admin/avisos/novo")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)

		expect(screen.getByRole("link", { name: "Novo aviso" })).toHaveAttribute(
			"aria-current",
			"page",
		)
	})

	test("o link não fica ativo em outra rota de administração", () => {
		setRole("ADMIN")
		setPathname("/admin/usuarios")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)

		expect(
			screen.getByRole("link", { name: "Novo aviso" }),
		).not.toHaveAttribute("aria-current")
	})

	test("MEMBER não vê o link Novo aviso", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)

		expect(
			screen.queryByRole("link", { name: "Novo aviso" }),
		).not.toBeInTheDocument()
	})
})

describe("AuthenticatedShell — sidebar escura por tokens", () => {
	test("a barra lateral usa só tokens sidebar-* nos dois temas", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const aside = screen.getByRole("complementary")
		expect(aside).toHaveClass(
			"bg-sidebar",
			"text-sidebar-foreground",
			"border-sidebar-border",
		)
	})

	test("o texto da marca na barra lateral usa o token de texto da sidebar", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const aside = screen.getByRole("complementary")
		const mark = aside.querySelector("a[href='/inicio'] > span")
		expect(mark).toHaveClass("text-sidebar-foreground")
		expect(mark).not.toHaveClass("text-white")
	})
})

describe("AuthenticatedShell — controle de animações", () => {
	test("exibe o MotionToggle nas duas variantes ao lado do ThemeToggle", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const header = within(screen.getByRole("banner"))
		const motionButtons = header.getAllByRole("button", {
			name: "Pausar animações",
		})
		const themeButtons = header.getAllByRole("button", { name: /modo/i })
		expect(motionButtons).toHaveLength(2)
		expect(themeButtons).toHaveLength(2)
		expect(motionButtons[0]?.parentElement).toBe(themeButtons[0]?.parentElement)
	})

	test("as variantes completa e compacta seguem as mesmas classes de visibilidade do ThemeToggle", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const [full, compact] = within(screen.getByRole("banner")).getAllByRole(
			"button",
			{ name: "Pausar animações" },
		)
		expect(full).toHaveClass("max-[560px]:hidden")
		expect(compact).toHaveClass("hidden", "max-[560px]:flex")
	})
})
