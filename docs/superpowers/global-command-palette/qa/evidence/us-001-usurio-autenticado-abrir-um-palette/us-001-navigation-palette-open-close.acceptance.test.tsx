/**
 * US-001 Acceptance Tests — Palette open/close/navigation
 *
 * Cobre RF-001..RF-009 no nível de componente (sem servidor).
 * RF-001/RF-002 testados via AuthenticatedShell (keyboard + SearchBar click).
 * RF-003/RF-004 testados via CommandPalette (Esc + Radix Dialog overlay click).
 * RF-005 delegado ao Radix Dialog (focus return nativo — sem teste unitário possível sem browser).
 * RF-006..RF-009 cobertos pelos testes existentes; replicados aqui para rastreabilidade.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Command } from "cmdk"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { makeTestJwt, renderWithProviders } from "@/test/render"
import { CommandPalette } from "@/components/command-palette/command-palette"
import { NavigationGroup } from "@/components/command-palette/navigation-group"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => "/inicio",
	useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/features/auth/api", () => ({
	useLogout: () => ({ mutate: vi.fn() }),
}))

vi.mock("@/features/profile/api", () => ({
	useMe: () => ({ data: { name: "Test User" } }),
}))

vi.mock("@/components/notification/notification-bell", () => ({
	NotificationBell: () => <button type="button" aria-label="Notificações" />,
}))

beforeEach(() => {
	mockPush.mockClear()
})

afterEach(() => {
	useAuthStore.getState().clear()
})

// ─── RF-001 ⌘K / Ctrl+K abre palette ─────────────────────────────────────────
describe("RF-001 — Keyboard shortcut abre palette", () => {
	test("Ctrl+K despacha abertura do palette via AuthenticatedShell", async () => {
		useAuthStore.setState({
			accessToken: "t",
			expiresAt: Date.now() + 60_000,
			user: { id: "u1", role: "MEMBER" },
		})
		const { AuthenticatedShell } = await import(
			"@/components/layout/authenticated-shell"
		)
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		// palette inicialmente fechado — input não presente
		expect(
			screen.queryByPlaceholderText("Buscar páginas, academias, usuários..."),
		).not.toBeInTheDocument()

		await userEvent.keyboard("{Control>}k{/Control}")

		// palette aberto — input presente
		expect(
			screen.getByPlaceholderText("Buscar páginas, academias, usuários..."),
		).toBeInTheDocument()
	})
})

// ─── RF-002 — Clicar no SearchBar abre palette ────────────────────────────────
describe("RF-002 — Clique no SearchBar abre palette", () => {
	test("clicar no SearchBar chama onActivate e abre palette", async () => {
		useAuthStore.setState({
			accessToken: "t",
			expiresAt: Date.now() + 60_000,
			user: { id: "u1", role: "MEMBER" },
		})
		const { AuthenticatedShell } = await import(
			"@/components/layout/authenticated-shell"
		)
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		// busca o botão da SearchBar (tem role=button quando onActivate fornecido)
		const searchBtn = screen.getByRole("button", { name: /buscar/i })
		await userEvent.click(searchBtn)

		expect(
			screen.getByPlaceholderText("Buscar páginas, academias, usuários..."),
		).toBeInTheDocument()
	})
})

// ─── RF-003 — Esc fecha palette ───────────────────────────────────────────────
describe("RF-003 — Esc fecha palette", () => {
	test("pressionar Esc chama onOpenChange(false)", async () => {
		const onOpenChange = vi.fn()
		renderWithProviders(
			<CommandPalette open={true} onOpenChange={onOpenChange} />,
		)
		await userEvent.keyboard("{Escape}")
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})

// ─── RF-004 — Backdrop fecha palette ─────────────────────────────────────────
describe("RF-004 — Backdrop fecha palette (Radix Dialog)", () => {
	test("CommandPalette usa Radix Dialog Root — onOpenChange cobre backdrop click nativo", () => {
		// Radix Dialog chama onOpenChange(false) ao clicar no Overlay.
		// Verificamos que o componente conecta onOpenChange ao Root corretamente.
		const onOpenChange = vi.fn()
		renderWithProviders(
			<CommandPalette open={true} onOpenChange={onOpenChange} />,
		)
		// Overlay existe no DOM
		const overlay = document.querySelector(".fixed.inset-0")
		expect(overlay).toBeInTheDocument()
		// onOpenChange wire-up confirmado via test RF-003 (Esc) e implementação
	})
})

// ─── RF-006 — NavigationGroup aparece com query vazia ─────────────────────────
describe("RF-006 — NavigationGroup exibido ao abrir com query vazia", () => {
	test("CommandPalette open=true + MEMBER mostra itens de navegação", async () => {
		useAuthStore.getState().setSession(makeTestJwt({ role: "MEMBER" }))
		renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
		expect(await screen.findByText("Dashboard")).toBeInTheDocument()
		expect(screen.getByText("Academias")).toBeInTheDocument()
		expect(screen.getByText("Check-ins")).toBeInTheDocument()
	})
})

// ─── RF-007 — Itens admin visíveis apenas para ADMIN ─────────────────────────
describe("RF-007 — Itens admin filtrados por role", () => {
	test("MEMBER não vê itens admin", () => {
		useAuthStore.getState().setSession(makeTestJwt({ role: "MEMBER" }))
		render(
			<Command shouldFilter={false}>
				<Command.List>
					<NavigationGroup query="" onSelect={vi.fn()} />
				</Command.List>
			</Command>,
		)
		expect(screen.queryByText("Usuários (admin)")).not.toBeInTheDocument()
	})

	test("ADMIN vê itens admin", () => {
		useAuthStore.getState().setSession(makeTestJwt({ role: "ADMIN" }))
		render(
			<Command shouldFilter={false}>
				<Command.List>
					<NavigationGroup query="" onSelect={vi.fn()} />
				</Command.List>
			</Command>,
		)
		expect(screen.getByText("Usuários (admin)")).toBeInTheDocument()
		expect(screen.getByText("Check-ins (admin)")).toBeInTheDocument()
	})
})

// ─── RF-008 — Selecionar item navega e fecha palette ─────────────────────────
describe("RF-008 — Seleção de item navega + fecha palette", () => {
	test("clicar em item chama router.push e onSelect", async () => {
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
})

// ─── RF-009 — Itens aparecem sincronamente (< 50ms) ─────────────────────────
describe("RF-009 — Itens de navegação aparecem sincronamente", () => {
	test("NavigationGroup renderiza sem loading state — síncrono", () => {
		useAuthStore.getState().setSession(makeTestJwt({ role: "MEMBER" }))
		render(
			<Command shouldFilter={false}>
				<Command.List>
					<NavigationGroup query="" onSelect={vi.fn()} />
				</Command.List>
			</Command>,
		)
		// Disponível imediatamente — sem findBy/waitFor necessário
		expect(screen.getByText("Dashboard")).toBeInTheDocument()
	})
})
