# Task 2: Recolher/expandir no AuthenticatedShell [FR-001, FR-002, FR-003, FR-004, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013]

**Status:** DONE
**PRD:** `../prd/prd-sidebar-collapse-toggle.md`
**Spec:** `../specs/sidebar-collapse-toggle-design.md`
**Depends on:** task-01

## Visão Geral

Tornar o `AuthenticatedShell` recolhível no desktop, dirigido pelo store da task-01. Adiciona: prop `defaultCollapsed` (seed do servidor), botão de toggle com `aria-expanded`/`aria-controls`, atalho `Cmd/Ctrl+B`, largura animada (268px ↔ 76px), tooltips nos itens recolhidos e nome acessível preservado em todos os itens. A media query `max-[860px]` continua dona do trilho forçado no mobile (independe do estado do usuário).

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`

### Conformidade com as Skills Padrão

- `react`: hooks (`useRef`, `useEffect`), seed do store por render, handler de teclado.
- `tailwindcss`: classes condicionais de largura/visibilidade, variantes `group-hover`/`group-focus-visible`, transição.
- `zustand`: consumir o store via seletor e `getState()` no handler de teclado.
- `vercel-composition-patterns`: extrair `CollapsedTooltip` e manter `SidebarNavItem` coeso.
- `vercel-react-best-practices`: evitar re-render desnecessário, seletores estreitos.
- `test-antipatterns`: testar comportamento observável (roles/aria/classes), sem mockar o store sob teste.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/sidebar-collapse-toggle-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? (Step 0)
- **Ferramentas de fidelidade visual (descobrir no ambiente):** inspecionar skills/MCPs de design-to-code ou teste visual configurados neste repo; se nenhuma, construir manualmente a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** trilho ~76px só com ícones centralizados; pílula ativa branca (claro)/verde (escuro); botão chevron na borda do menu; tooltip à direita do ícone só quando recolhido; tokens `--color-sidebar*` e `--color-primary`.

## Passos

- **Step 0: Confirmar fonte de design & ferramentas de fidelidade**

Ler a seção `### Fidelidade Visual` acima. Confirmar com o usuário se há uma fonte de design original (URL/export). Não há tooling assumido — inspecionar `chat.agentSkillsLocations` + MCPs conectados; se não houver, construir contra o mockup curado `../specs/mockups/sidebar-collapse-toggle-visual.md`. Este step nunca bloqueia: "sem fonte/sem tooling" roteia para implementação manual contra o mockup.

- **Step 1: Escrever os testes falhos do toggle/a11y**

Acrescentar a `apps/frontend/src/components/layout/authenticated-shell.test.tsx`. Primeiro, ajustar os imports do topo (adicionar `fireEvent`, `beforeEach`, e o reset do store):

```ts
import { fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { useSidebarCollapseStore } from "@/lib/ui-state/sidebar-collapse-store"
```

Adicionar um reset do store de recolhimento (junto ao `afterEach` existente do auth store):

```ts
beforeEach(() => useSidebarCollapseStore.setState({ collapsed: false }))
```

Acrescentar o bloco de testes ao final do arquivo:

```tsx
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
		expect(
			screen.getByRole("link", { name: "Dashboard" }),
		).toBeInTheDocument()
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
```

- **Step 2: Rodar os testes e ver falhar**

Run: `pnpm --filter frontend test -- --run src/components/layout/authenticated-shell.test.tsx`
Expected: FAIL — não há botão "Recolher menu"; `defaultCollapsed` não existe.

- **Step 3: Implementar o shell recolhível**

Substituir o conteúdo de `apps/frontend/src/components/layout/authenticated-shell.tsx` por:

```tsx
"use client"

import {
	BarChart3,
	Building2,
	CheckCircle,
	CreditCard,
	LayoutDashboard,
	LogOut,
	PanelLeftClose,
	PanelLeftOpen,
	User,
	Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { CommandPalette } from "@/components/command-palette/command-palette"
import { NotificationBell } from "@/components/notification/notification-bell"
import { Avatar } from "@/components/ui/avatar"
import { BrandMark } from "@/components/ui/brand-mark"
import { SearchBar } from "@/components/ui/search-bar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useLogout } from "@/features/auth/api"
import { useMe } from "@/features/profile/api"
import { useAuthStore } from "@/lib/auth/auth-store"
import { cn } from "@/lib/cn"
import { useSidebarCollapseStore } from "@/lib/ui-state/sidebar-collapse-store"

interface NavItem {
	href: string
	label: string
	icon: React.ElementType
}

const MAIN_NAV_ITEMS: ReadonlyArray<NavItem> = [
	{ href: "/inicio", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/check-ins", label: "Check-ins", icon: CheckCircle },
	{ href: "/academias", label: "Academias", icon: Building2 },
	{ href: "/perfil", label: "Perfil", icon: User },
	{ href: "/assinatura", label: "Assinatura", icon: CreditCard },
]

const ADMIN_NAV_ITEMS: ReadonlyArray<NavItem> = [
	{ href: "/admin/usuarios", label: "Usuários", icon: Users },
	{ href: "/admin/check-ins", label: "Check-ins", icon: CheckCircle },
	{ href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
]

function isPathActive(pathname: string | null, href: string): boolean {
	if (!pathname) return false
	return pathname === href || pathname.startsWith(`${href}/`)
}

function CollapsedTooltip({ label }: { label: string }) {
	return (
		<span
			role="tooltip"
			aria-hidden="true"
			className="pointer-events-none absolute left-full z-30 ml-3 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md group-hover/nav:block group-focus-visible/nav:block"
		>
			{label}
		</span>
	)
}

function SidebarNavItem({
	item,
	pathname,
	collapsed,
}: {
	item: NavItem
	pathname: string | null
	collapsed: boolean
}) {
	const active = isPathActive(pathname, item.href)
	const Icon = item.icon
	return (
		<Link
			href={item.href}
			aria-current={active ? "page" : undefined}
			aria-label={item.label}
			className={cn(
				"group/nav relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors max-[860px]:justify-center",
				collapsed && "justify-center",
				active
					? "bg-sidebar-active font-semibold text-sidebar-active-foreground"
					: "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
			)}
		>
			<Icon className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true" />
			<span className={cn("flex-1 max-[860px]:hidden", collapsed && "hidden")}>
				{item.label}
			</span>
			{collapsed && <CollapsedTooltip label={item.label} />}
		</Link>
	)
}

export interface AuthenticatedShellProps {
	children: ReactNode
	className?: string
	defaultCollapsed?: boolean
}

export function AuthenticatedShell({
	children,
	className,
	defaultCollapsed = false,
}: AuthenticatedShellProps) {
	const user = useAuthStore((state) => state.user)
	const router = useRouter()
	const pathname = usePathname()
	const logout = useLogout()
	const { data: meData } = useMe()
	const isAdmin = user?.role === "ADMIN"
	const displayName = meData?.name ?? (isAdmin ? "Administrador" : "Membro")
	const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

	const hydratedRef = useRef(false)
	if (!hydratedRef.current) {
		useSidebarCollapseStore.getState().hydrate(defaultCollapsed)
		hydratedRef.current = true
	}
	const collapsed = useSidebarCollapseStore((state) => state.collapsed)
	const toggleCollapsed = useSidebarCollapseStore((state) => state.toggle)

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault()
				setIsCommandPaletteOpen(true)
				return
			}
			if ((e.metaKey || e.ctrlKey) && e.key === "b") {
				e.preventDefault()
				useSidebarCollapseStore.getState().toggle()
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])

	function handleLogout() {
		logout.mutate(undefined, {
			onSettled: () => router.replace("/login"),
			onError: () =>
				toast.error("Não foi possível sair da sessão. Tente novamente."),
		})
	}

	return (
		<div
			data-testid="authenticated-shell"
			className={cn(
				"grid h-screen bg-background text-foreground transition-[grid-template-columns] duration-200 ease-out max-[860px]:grid-cols-[76px_1fr]",
				collapsed ? "grid-cols-[76px_1fr]" : "grid-cols-[268px_1fr]",
				className,
			)}
		>
			<aside className="flex flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground max-[860px]:px-3">
				<div
					className={cn(
						"mb-6 flex items-center gap-2 px-2 max-[860px]:flex-col max-[860px]:gap-3",
						collapsed ? "flex-col gap-3" : "justify-between",
					)}
				>
					<Link href="/inicio" className="flex items-center">
						<BrandMark
							wordmark
							className={cn(
								"text-white max-[860px]:[&>span:last-child]:hidden",
								collapsed && "[&>span:last-child]:hidden",
							)}
						/>
					</Link>
					<button
						type="button"
						onClick={toggleCollapsed}
						aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
						aria-expanded={!collapsed}
						aria-controls="sidebar-nav"
						className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
					>
						{collapsed ? (
							<PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
						) : (
							<PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
						)}
					</button>
				</div>

				<nav
					id="sidebar-nav"
					aria-label="Navegação principal"
					className="flex flex-1 flex-col gap-1 overflow-y-auto"
				>
					<p
						className={cn(
							"px-3 pb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-sidebar-muted max-[860px]:hidden",
							collapsed && "hidden",
						)}
					>
						Principal
					</p>
					{MAIN_NAV_ITEMS.map((item) => (
						<SidebarNavItem
							key={item.href}
							item={item}
							pathname={pathname}
							collapsed={collapsed}
						/>
					))}

					{isAdmin && (
						<>
							<p
								className={cn(
									"mt-4 px-3 pb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-sidebar-muted max-[860px]:hidden",
									collapsed && "hidden",
								)}
							>
								Admin
							</p>
							{ADMIN_NAV_ITEMS.map((item) => (
								<SidebarNavItem
									key={item.href}
									item={item}
									pathname={pathname}
									collapsed={collapsed}
								/>
							))}
						</>
					)}

					<div className="mt-4 border-t border-sidebar-border pt-3">
						<button
							type="button"
							aria-label="Sair"
							onClick={handleLogout}
							className={cn(
								"group/nav relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-destructive max-[860px]:justify-center",
								collapsed && "justify-center",
							)}
						>
							<LogOut
								className="h-[18px] w-[18px] flex-shrink-0"
								aria-hidden="true"
							/>
							<span className={cn("max-[860px]:hidden", collapsed && "hidden")}>
								Sair
							</span>
							{collapsed && <CollapsedTooltip label="Sair" />}
						</button>
					</div>
				</nav>

				<div className="mt-2 flex items-center gap-2 border-t border-sidebar-border pt-4">
					<div
						className={cn(
							"flex min-w-0 flex-1 items-center gap-3 max-[860px]:justify-center",
							collapsed && "justify-center",
						)}
					>
						<Avatar name={meData?.name} size="sm" />
						<div
							className={cn(
								"min-w-0 max-[860px]:hidden",
								collapsed && "hidden",
							)}
						>
							<p className="truncate text-sm font-semibold text-sidebar-foreground">
								{displayName}
							</p>
							<p className="text-[10.5px] tracking-wider text-sidebar-muted">
								{isAdmin ? "ADMIN" : "MEMBRO"}
							</p>
						</div>
					</div>
				</div>
			</aside>

			<div className="flex min-w-0 flex-col">
				<header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/80 px-8 py-4 backdrop-blur-md max-[560px]:px-4">
					<SearchBar
						showShortcut
						placeholder="Buscar..."
						aria-label="Buscar"
						className="max-w-[460px] flex-1 max-[560px]:hidden"
						onActivate={() => setIsCommandPaletteOpen(true)}
					/>
					<div className="ml-auto flex items-center gap-3">
						<ThemeToggle />
						<NotificationBell />
						<Link href="/perfil" aria-label="Ir para perfil">
							<Avatar name={meData?.name} size="sm" />
						</Link>
					</div>
				</header>

				<CommandPalette
					open={isCommandPaletteOpen}
					onOpenChange={setIsCommandPaletteOpen}
				/>

				<main className="flex-1 overflow-y-auto">
					<div className="route-fade mx-auto max-w-[1180px] px-8 pb-20 pt-9 max-[560px]:px-[18px]">
						{children}
					</div>
				</main>
			</div>
		</div>
	)
}
```

- **Step 4: Rodar os testes e ver passar**

Run: `pnpm --filter frontend test -- --run src/components/layout/authenticated-shell.test.tsx`
Expected: PASS (testes existentes + 5 novos).

- **Step 5: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas Biome; tsc sem erros.

- **Step 6: Commit**

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(sidebar): recolher/expandir com toggle, atalho e tooltips no shell"
```

## Critérios de Sucesso

- [ ] Botão de toggle com `aria-label` dinâmico, `aria-expanded` e `aria-controls="sidebar-nav"` (FR-001, FR-010).
- [ ] Recolhido = trilho 76px só com ícones; expandido = 268px com labels; transição animada (FR-002, FR-003, FR-004).
- [ ] Itens recolhidos mantêm nome acessível (`aria-label`) e exibem tooltip no hover/focus (FR-008, FR-009).
- [ ] `Cmd/Ctrl+B` alterna; `Cmd/Ctrl+K` segue abrindo o command palette (FR-011).
- [ ] `defaultCollapsed` seedeia o estado inicial sem clobber em toggles subsequentes (FR-006/FR-013 suporte).
- [ ] Em ≤860px o trilho permanece forçado pela media query, independente do estado (FR-012).
- [ ] `lint:fix`, `tsc:check` e os testes passam 100%.
