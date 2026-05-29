# Task 6: Redesign do shell autenticado (sidebar dark + topbar + responsivo) [RF-011, RF-012, RF-013, RF-022]

**Status:** PENDING
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Reescreve o `AuthenticatedShell` no vocabulário VOLT: sidebar dark fixa (tokens `--color-sidebar-*`) com `BrandMark`, grupos de navegação com labels mono (`Principal`/`Admin`), `user-chip` + logout no rodapé; e uma topbar sticky com `SearchBar`, `ThemeToggle`, sino com indicador e `Avatar`. Em telas < 860px a sidebar colapsa para icon-rail (76px). Preserva os hooks de dados (`useMe`, `useLogout`, `useAuthStore`) e o gating de admin por role.

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Modify: `apps/frontend/src/app/layout.tsx` (remover o `ThemeToggle` flutuante temporário)
- Test: `apps/frontend/src/components/layout/authenticated-shell.test.tsx` (novo ou substituído)

### Conformidade com as Skills Padrão

- use code-style: View/Controller leve, tokens semânticos de sidebar, `aria-current` na rota ativa
- use vercel-react-best-practices: evitar re-render desnecessário; manter componentes focados
- use test-antipatterns: asserir navegação/role visíveis, mockar `next/navigation` e auth-store

## Passos

- [ ] **Step 1: Escrever o teste que falha (estrutura VOLT do shell)**

Crie/Substitua `apps/frontend/src/components/layout/authenticated-shell.test.tsx`:

```tsx
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
		render(<AuthenticatedShell><p>conteúdo</p></AuthenticatedShell>)
		expect(screen.getAllByText("VOLT").length).toBeGreaterThanOrEqual(1)
		expect(screen.getByRole("link", { name: /Dashboard/ })).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /Academias/ })).toBeInTheDocument()
	})

	test("oculta a seção Admin para MEMBER", () => {
		setRole("MEMBER")
		render(<AuthenticatedShell><p>conteúdo</p></AuthenticatedShell>)
		expect(screen.queryByText("Admin")).not.toBeInTheDocument()
	})

	test("exibe a seção Admin para ADMIN", () => {
		setRole("ADMIN")
		render(<AuthenticatedShell><p>conteúdo</p></AuthenticatedShell>)
		expect(screen.getByText("Admin")).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /Usuários/ })).toBeInTheDocument()
	})

	test("renderiza o toggle de tema na topbar", () => {
		setRole("MEMBER")
		render(<AuthenticatedShell><p>conteúdo</p></AuthenticatedShell>)
		expect(screen.getByRole("button", { name: /tema/i })).toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "AuthenticatedShell — VOLT"`
Expected: FAIL — estrutura/marca antiga ("GymPass", sem toggle na topbar).

- [ ] **Step 3: Reescrever `authenticated-shell.tsx`**

Substitua TODO o conteúdo por:

```tsx
"use client"

import {
	Bell,
	Building2,
	CheckCircle,
	CreditCard,
	LayoutDashboard,
	LogOut,
	User,
	Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type ReactNode } from "react"
import { toast } from "sonner"
import { useLogout } from "@/features/auth/api"
import { useMe } from "@/features/profile/api"
import { Avatar } from "@/components/ui/avatar"
import { BrandMark } from "@/components/ui/brand-mark"
import { SearchBar } from "@/components/ui/search-bar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
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

function SidebarNavItem({
	item,
	pathname,
}: {
	item: NavItem
	pathname: string | null
}) {
	const active = isPathActive(pathname, item.href)
	const Icon = item.icon
	return (
		<Link
			href={item.href}
			aria-current={active ? "page" : undefined}
			className={cn(
				"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors max-[860px]:justify-center",
				active
					? "bg-sidebar-active font-semibold text-sidebar-active-foreground"
					: "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
			)}
		>
			<Icon className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true" />
			<span className="flex-1 max-[860px]:hidden">{item.label}</span>
		</Link>
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
	const logout = useLogout()
	const { data: meData } = useMe()
	const isAdmin = user?.role === "ADMIN"
	const displayName = meData?.name ?? (isAdmin ? "Administrador" : "Membro")

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
				"grid h-screen grid-cols-[268px_1fr] bg-background text-foreground max-[860px]:grid-cols-[76px_1fr]",
				className,
			)}
		>
			<aside className="flex flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground max-[860px]:px-3">
				<Link
					href="/inicio"
					className="mb-6 flex items-center px-2 max-[860px]:justify-center"
				>
					<BrandMark
						wordmark
						className="text-white max-[860px]:[&>span:last-child]:hidden"
					/>
				</Link>

				<nav
					aria-label="Navegação principal"
					className="flex flex-1 flex-col gap-1 overflow-y-auto"
				>
					<p className="px-3 pb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-sidebar-muted max-[860px]:hidden">
						Principal
					</p>
					{MAIN_NAV_ITEMS.map((item) => (
						<SidebarNavItem key={item.href} item={item} pathname={pathname} />
					))}

					{isAdmin && (
						<>
							<p className="mt-4 px-3 pb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-sidebar-muted max-[860px]:hidden">
								Admin
							</p>
							{ADMIN_NAV_ITEMS.map((item) => (
								<SidebarNavItem
									key={item.href}
									item={item}
									pathname={pathname}
								/>
							))}
						</>
					)}
				</nav>

				<div className="mt-2 flex items-center gap-2 border-t border-sidebar-border pt-4">
					<div className="flex min-w-0 flex-1 items-center gap-3 max-[860px]:justify-center">
						<Avatar name={meData?.name} size="sm" />
						<div className="min-w-0 max-[860px]:hidden">
							<p className="truncate text-sm font-semibold text-sidebar-foreground">
								{displayName}
							</p>
							<p className="text-[10.5px] tracking-wider text-sidebar-muted">
								{isAdmin ? "ADMIN" : "MEMBRO"}
							</p>
						</div>
					</div>
					<button
						type="button"
						aria-label="Sair"
						onClick={handleLogout}
						className="inline-flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-md border border-sidebar-border text-sidebar-muted transition-colors hover:border-destructive hover:text-destructive max-[860px]:hidden"
					>
						<LogOut className="h-4 w-4" />
					</button>
				</div>
			</aside>

			<div className="flex min-w-0 flex-col">
				<header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/80 px-8 py-4 backdrop-blur-md max-[560px]:px-4">
					<SearchBar
						showShortcut
						placeholder="Buscar..."
						aria-label="Buscar"
						className="max-w-[460px] flex-1 max-[560px]:hidden"
					/>
					<div className="ml-auto flex items-center gap-3">
						<ThemeToggle />
						<button
							type="button"
							aria-label="Notificações"
							className="relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
						>
							<Bell className="h-4 w-4" />
							<span className="absolute right-2.5 top-2.5 h-[7px] w-[7px] rounded-full border-2 border-surface bg-accent" />
						</button>
						<Avatar name={meData?.name} size="sm" />
					</div>
				</header>

				<main className="flex-1 overflow-y-auto">
					<div className="mx-auto max-w-[1180px] px-8 pb-20 pt-9 max-[560px]:px-[18px]">
						{children}
					</div>
				</main>
			</div>
		</div>
	)
}
```

- [ ] **Step 4: Remover o `ThemeToggle` flutuante temporário do `layout.tsx`**

Em `apps/frontend/src/app/layout.tsx`, remova o import e o wrapper fixo do `ThemeToggle` (agora ele vive na topbar do shell). Apague estas linhas:

```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle"
```

```tsx
<div className="fixed bottom-6 right-6 z-50">
	<ThemeToggle />
</div>
```

- [ ] **Step 5: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "AuthenticatedShell — VOLT"`
Expected: PASS (4 testes).

- [ ] **Step 6: Rodar a suíte completa e corrigir testes do shell antigo**

Run: `pnpm --filter frontend test`
Expected: PASS. Se algum teste antigo asserir o drawer mobile (`mobile-sidebar`, botão hambúrguer) ou a marca "GymPass" do shell, atualize-o para a nova estrutura (sidebar persistente em icon-rail, sem drawer) ou remova as asserções obsoletas.

- [ ] **Step 7: Lint, tsc e build**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx apps/frontend/src/app/layout.tsx
git commit -m "feat(volt-redesign): shell autenticado com sidebar dark, topbar e icon-rail responsivo"
```

## Critérios de Sucesso

- Sidebar dark com BrandMark, grupos mono e user-chip + logout [RF-011]
- Rota ativa destacada com `bg-sidebar-active` e `aria-current` [RF-012]
- Seção Admin visível só para ADMIN [RF-013]
- Sidebar colapsa para icon-rail (76px) abaixo de 860px [RF-022]
- ThemeToggle vive na topbar; removido do layout
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
