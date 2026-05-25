# Task 5: AuthenticatedShell — sidebar com identidade indigo

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/design-system-migration-design.md`

## Visão Geral

Transformar a sidebar do `AuthenticatedShell` para usar fundo indigo (`bg-primary`) em light mode. Atualizar todas as cores de texto, estados de hover/ativo e o footer para refletir o contexto sobre fundo escuro. Em dark mode, a sidebar usa `bg-card` (`#1b1938`) com `border-r border-border` para separação.

Arquivo: `apps/frontend/src/components/layout/authenticated-shell.tsx`

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`

### Conformidade com as Skills Padrão

- react: componente client-side com `useState` para controle mobile — manter sem alteração
- tailwindcss: usar `dark:` prefix para overrides de dark mode inline nas classes
- vercel-composition-patterns: `SidebarContent` como componente interno — manter a separação

## Passos

- [ ] **Step 1: Atualizar o teste de AuthenticatedShell**

Abrir `apps/frontend/src/components/layout/authenticated-shell.test.tsx`. Adicionar (ou atualizar) asserção sobre a sidebar:

```typescript
test("sidebar desktop deve ter fundo bg-primary", () => {
  // ... setup com renderWithProviders e mock de useMe/useAuthStore ...
  const sidebar = document.querySelector("aside.hidden")
  expect(sidebar).toHaveClass("bg-primary")
})
```

Adaptar ao padrão existente do arquivo de teste (pode usar `data-testid` se disponível).

- [ ] **Step 2: Executar o teste para confirmar falha**

```bash
pnpm --filter frontend test -- -t "sidebar desktop deve ter fundo bg-primary"
```

Esperado: FAIL.

- [ ] **Step 3: Atualizar authenticated-shell.tsx — sidebar indigo**

Substituir o conteúdo de `apps/frontend/src/components/layout/authenticated-shell.tsx`:

```typescript
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
import { useMe } from "@/features/profile/api"
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
					? "bg-primary-foreground text-primary"
					: "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground",
			)}
		>
			<Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
			{item.label}
		</Link>
	)
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

interface SidebarContentProps {
	pathname: string | null
	role: "MEMBER" | "ADMIN" | undefined
	name?: string
	onNavigate?: () => void
	onLogout: () => void
}

function SidebarContent({
	pathname,
	role,
	name,
	onNavigate,
	onLogout,
}: SidebarContentProps) {
	return (
		<div className="flex h-full flex-col px-3 py-4">
			<div className="mb-4 border-b border-primary-foreground/20 px-2 pb-4">
				<Link
					href="/inicio"
					onClick={onNavigate}
					className="font-display text-lg font-semibold tracking-tight text-primary-foreground"
				>
					GymPass
				</Link>
			</div>

			<nav aria-label="Navegação principal" className="flex flex-col gap-1">
				<p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-primary-foreground/50">
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
				<nav aria-label="Administração" className="mt-4 flex flex-col gap-1">
					<p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-accent">
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

			<div className="mt-auto border-t border-primary-foreground/20 pt-4">
				<div className="flex items-center gap-2 px-2 py-1">
					<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
						{name ? (
							<span
								className="text-xs font-medium text-primary-foreground"
								aria-hidden="true"
							>
								{getInitials(name)}
							</span>
						) : (
							<User
								className="h-4 w-4 text-primary-foreground/70"
								aria-hidden="true"
							/>
						)}
					</div>
					<span className="min-w-0 flex-1 truncate text-xs text-primary-foreground/70">
						{name ?? (role === "ADMIN" ? "Administrador" : "Membro")}
					</span>
					<button
						type="button"
						aria-label="Sair"
						onClick={onLogout}
						className="rounded-full p-1 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
	const { data: meData } = useMe()

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
			<aside className="hidden w-56 flex-shrink-0 bg-primary dark:bg-card dark:border-r dark:border-border lg:block">
				<div className="sticky top-0 h-screen overflow-y-auto">
					<SidebarContent
						pathname={pathname}
						role={user?.role}
						name={meData?.name}
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
					"fixed inset-y-0 left-0 z-50 w-56 bg-primary dark:bg-card dark:border-r dark:border-border transition-transform duration-200 lg:hidden",
					mobileOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<button
					type="button"
					aria-label="Fechar menu"
					onClick={() => setMobileOpen(false)}
					className="absolute right-3 top-3 rounded-full p-1 text-primary-foreground/70 hover:bg-primary-foreground/10"
				>
					<X className="h-4 w-4" />
				</button>
				<SidebarContent
					pathname={pathname}
					role={user?.role}
					name={meData?.name}
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
						className="rounded-full p-2 text-foreground hover:bg-muted"
					>
						<Menu className="h-5 w-5" />
					</button>
					<Link
						href="/inicio"
						className="ml-3 font-display text-lg font-semibold tracking-tight"
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

- [ ] **Step 4: Executar o teste para confirmar aprovação**

```bash
pnpm --filter frontend test -- -t "sidebar desktop deve ter fundo bg-primary"
```

Esperado: PASS.

- [ ] **Step 5: Verificar lint, tipos e todos os testes**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test
```

Esperado: zero erros, todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx \
        apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(frontend/layout): sidebar com identidade indigo navy e tokens sobre fundo escuro"
```

## Critérios de Sucesso

- Desktop sidebar usa `bg-primary` (indigo) em light mode
- Dark mode usa `bg-card dark:border-r dark:border-border`
- Nav items usam `text-primary-foreground/70` com hover `text-primary-foreground`
- Item ativo usa `bg-primary-foreground text-primary` (pill branco invertido)
- Label "Admin" usa `text-accent` (violet)
- Footer usa `text-primary-foreground/70` e avatar `bg-primary-foreground/20`
- Todos os testes passam, lint e tsc sem erros
