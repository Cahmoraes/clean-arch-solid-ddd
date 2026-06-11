# Task 1: Refatorar AuthenticatedShell → AppSidebar [RF-004, RF-005, RF-006, RF-007, RF-008]

**Status:** DONE
**PRD:** `../prd/prd-dashboard-inicio.md`
**Spec:** `../specs/dashboard-inicio-design.md`

## Visão Geral

Substituir o top-nav com abas do `AuthenticatedShell` por uma sidebar lateral fixa. Em desktop (≥1024px) a sidebar fica visível; em mobile aparece como painel deslizante ativado por um botão hamburger. A mudança se aplica automaticamente a todas as rotas autenticadas via `src/app/(authenticated)/layout.tsx`. A seção Admin na sidebar é exibida condicionalmente para `role === "ADMIN"`.

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`

### Conformidade com as Skills Padrão

- react: hooks, props, composição de componentes
- tailwindcss: classes responsivas lg:, translate-x, transition
- shadcn: design system monocromático, pill-shape, sem shadows

## Passos

- [ ] **Step 1: Escrever o teste que verifica a sidebar desktop**

```tsx
// apps/frontend/src/components/layout/authenticated-shell.test.tsx
// Substituir TODO o conteúdo do arquivo pelo seguinte:

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
		const sidebar = screen.getByRole("navigation", { name: /navegação principal/i })
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
		expect(adminNav.querySelector('[href="/admin/usuarios"]')).toBeInTheDocument()
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
```

- [ ] **Step 2: Rodar os testes para confirmar que falham (shell ainda é top-nav)**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose authenticated-shell
```

Esperado: FAIL — os testes buscam `navigation[name="navegação principal"]` com sidebar e `data-testid="mobile-sidebar"` que não existem ainda.

- [ ] **Step 3: Reescrever o AuthenticatedShell com sidebar**

```tsx
// apps/frontend/src/components/layout/authenticated-shell.tsx
// Substituir TODO o conteúdo pelo seguinte:

"use client"

import {
	Building2,
	CheckCircle,
	CreditCard,
	LayoutDashboard,
	LogOut,
	Menu,
	User,
	Users,
	X,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"
import { useLogout } from "@/features/auth/api"
import { useAuthStore } from "@/lib/auth/auth-store"
import { cn } from "@/lib/cn"

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
]

function isPathActive(pathname: string | null, href: string): boolean {
	if (!pathname) return false
	return pathname === href || pathname.startsWith(`${href}/`)
}

interface SidebarNavItemProps {
	item: NavItem
	pathname: string | null
	onClick?: () => void
}

function SidebarNavItem({ item, pathname, onClick }: SidebarNavItemProps) {
	const active = isPathActive(pathname, item.href)
	const Icon = item.icon
	return (
		<Link
			href={item.href}
			onClick={onClick}
			aria-current={active ? "page" : undefined}
			className={cn(
				"flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors",
				active
					? "bg-foreground text-background"
					: "text-muted-foreground hover:bg-accent hover:text-foreground",
			)}
		>
			<Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
			{item.label}
		</Link>
	)
}

interface SidebarContentProps {
	pathname: string | null
	role: "MEMBER" | "ADMIN" | undefined
	onNavigate?: () => void
	onLogout: () => void
}

function SidebarContent({
	pathname,
	role,
	onNavigate,
	onLogout,
}: SidebarContentProps) {
	return (
		<div className="flex h-full flex-col px-3 py-4">
			<div className="mb-4 border-b border-border px-2 pb-4">
				<Link
					href="/inicio"
					onClick={onNavigate}
					className="font-display text-lg font-medium tracking-tight"
				>
					GymPass
				</Link>
			</div>

			<nav aria-label="Navegação principal" className="flex flex-col gap-1">
				<p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
					Principal
				</p>
				{MAIN_NAV_ITEMS.map((item) => (
					<SidebarNavItem
						key={item.href}
						item={item}
						pathname={pathname}
						onClick={onNavigate}
					/>
				))}
			</nav>

			{role === "ADMIN" && (
				<nav
					aria-label="Administração"
					className="mt-4 flex flex-col gap-1"
				>
					<p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
						Admin
					</p>
					{ADMIN_NAV_ITEMS.map((item) => (
						<SidebarNavItem
							key={item.href}
							item={item}
							pathname={pathname}
							onClick={onNavigate}
						/>
					))}
				</nav>
			)}

			<div className="mt-auto border-t border-border pt-4">
				<div className="flex items-center gap-2 px-2 py-1">
					<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
						<User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
					</div>
					<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
						{role === "ADMIN" ? "Administrador" : "Membro"}
					</span>
					<button
						type="button"
						aria-label="Sair"
						onClick={onLogout}
						className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
					>
						<LogOut className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	)
}

export interface AuthenticatedShellProps {
	children: ReactNode
	className?: string
}

export function AuthenticatedShell({
	children,
	className,
}: AuthenticatedShellProps) {
	const user = useAuthStore((state) => state.user)
	const router = useRouter()
	const pathname = usePathname()
	const [mobileOpen, setMobileOpen] = useState(false)
	const logout = useLogout()

	function handleLogout() {
		logout.mutate(undefined, {
			onSettled: () => {
				router.replace("/login")
			},
			onError: () => {
				toast.error("Não foi possível sair da sessão. Tente novamente.")
			},
		})
	}

	return (
		<div
			data-testid="authenticated-shell"
			className={cn(
				"flex min-h-screen bg-background text-foreground",
				className,
			)}
		>
			{/* Desktop sidebar */}
			<aside className="hidden w-56 flex-shrink-0 border-r border-border lg:block">
				<div className="sticky top-0 h-screen overflow-y-auto">
					<SidebarContent
						pathname={pathname}
						role={user?.role}
						onLogout={handleLogout}
					/>
				</div>
			</aside>

			{/* Mobile overlay */}
			{mobileOpen && (
				<div
					aria-hidden="true"
					className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
					onClick={() => setMobileOpen(false)}
				/>
			)}

			{/* Mobile sidebar panel */}
			<aside
				data-testid="mobile-sidebar"
				aria-label="Menu de navegação móvel"
				aria-hidden={!mobileOpen}
				className={cn(
					"fixed inset-y-0 left-0 z-50 w-56 border-r border-border bg-background transition-transform duration-200 lg:hidden",
					mobileOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<button
					type="button"
					aria-label="Fechar menu"
					onClick={() => setMobileOpen(false)}
					className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-accent"
				>
					<X className="h-4 w-4" />
				</button>
				<SidebarContent
					pathname={pathname}
					role={user?.role}
					onNavigate={() => setMobileOpen(false)}
					onLogout={handleLogout}
				/>
			</aside>

			{/* Main */}
			<div className="flex min-w-0 flex-1 flex-col">
				{/* Mobile header */}
				<header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background px-4 lg:hidden">
					<button
						type="button"
						aria-label="Abrir menu de navegação"
						aria-expanded={mobileOpen}
						onClick={() => setMobileOpen(true)}
						className="rounded-full p-2 text-foreground hover:bg-accent"
					>
						<Menu className="h-5 w-5" />
					</button>
					<Link
						href="/inicio"
						className="ml-3 font-display text-lg font-medium tracking-tight"
					>
						GymPass
					</Link>
				</header>

				<main className="flex-1 p-6">{children}</main>
			</div>
		</div>
	)
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose authenticated-shell
```

Esperado: PASS — todos os 5 testes do describe passam.

- [ ] **Step 5: Rodar lint e type-check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros em ambos.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx \
        apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(frontend): replace top-nav with AppSidebar in AuthenticatedShell"
```

## Critérios de Sucesso

- Todos os 5 testes de `authenticated-shell.test.tsx` passam
- Sidebar desktop visível em `lg:` e acima (classe `lg:block`)
- Mobile sidebar com `data-testid="mobile-sidebar"` e `aria-hidden` correto
- Seção admin visível apenas para role `ADMIN`
- Logout redireciona para `/login`
- `pnpm lint:fix` e `pnpm tsc:check` passam sem erros [RF-004, RF-005, RF-006, RF-007, RF-008]
