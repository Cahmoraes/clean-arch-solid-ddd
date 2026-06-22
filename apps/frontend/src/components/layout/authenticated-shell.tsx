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
			aria-hidden="true"
			className="pointer-events-none absolute left-full z-30 ml-3 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md group-hover/nav:block group-focus-visible/nav:block"
		>
			{label}
		</span>
	)
}

function handleSidebarKeyDown(e: KeyboardEvent, openPalette: () => void): void {
	if (!(e.metaKey || e.ctrlKey)) return
	if (e.key === "k") {
		e.preventDefault()
		openPalette()
	} else if (e.key === "b") {
		e.preventDefault()
		useSidebarCollapseStore.getState().toggle()
	}
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: shell de layout com múltiplos estados condicionais (recolhido, admin, avatar) — subcomponentes adicionais requereria prop drilling extensivo sem ganho de legibilidade
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
		const handler = (e: KeyboardEvent) =>
			handleSidebarKeyDown(e, () => setIsCommandPaletteOpen(true))
		window.addEventListener("keydown", handler)
		return () => window.removeEventListener("keydown", handler)
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
							<PanelLeftClose
								className="h-[18px] w-[18px]"
								aria-hidden="true"
							/>
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
								"group/nav relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-destructive max-[860px]:justify-center",
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
