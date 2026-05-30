"use client"

import {
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
import type { ReactNode } from "react"
import { toast } from "sonner"
import { NotificationBell } from "@/components/notification/notification-bell"
import { Avatar } from "@/components/ui/avatar"
import { BrandMark } from "@/components/ui/brand-mark"
import { SearchBar } from "@/components/ui/search-bar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
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

					<div className="mt-4 border-t border-sidebar-border pt-3">
						<button
							type="button"
							aria-label="Sair"
							onClick={handleLogout}
							className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors max-[860px]:justify-center text-sidebar-muted hover:bg-white/5 hover:text-destructive"
						>
							<LogOut
								className="h-[18px] w-[18px] flex-shrink-0"
								aria-hidden="true"
							/>
							<span className="max-[860px]:hidden">Sair</span>
						</button>
					</div>
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
						<NotificationBell />
						<Avatar name={meData?.name} size="sm" />
					</div>
				</header>

				<main className="flex-1 overflow-y-auto">
					<div className="route-fade mx-auto max-w-[1180px] px-8 pb-20 pt-9 max-[560px]:px-[18px]">
						{children}
					</div>
				</main>
			</div>
		</div>
	)
}
