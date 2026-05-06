"use client"

import { LogOut, Menu, User, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type ReactNode, useId, useState } from "react"
import { toast } from "sonner"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLogout } from "@/features/auth/api"
import { useAuthStore } from "@/lib/auth/auth-store"
import { cn } from "@/lib/cn"

export interface NavItem {
	href: string
	label: string
	requiresRole?: "ADMIN"
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
	{ href: "/perfil", label: "Perfil" },
	{ href: "/academias", label: "Academias" },
	{ href: "/check-ins", label: "Check-ins" },
	{ href: "/assinatura", label: "Assinatura" },
	{ href: "/admin/usuarios", label: "Admin", requiresRole: "ADMIN" },
]

function isPathActive(pathname: string | null, href: string): boolean {
	if (!pathname) return false
	return pathname === href || pathname.startsWith(`${href}/`)
}

interface DesktopNavProps {
	items: ReadonlyArray<NavItem>
	pathname: string | null
}

function DesktopNav({ items, pathname }: DesktopNavProps) {
	return (
		<nav
			aria-label="Navegação principal"
			className="hidden items-center gap-1 md:flex"
		>
			{items.map((item) => {
				const active = isPathActive(pathname, item.href)
				return (
					<Link
						key={item.href}
						href={item.href}
						data-testid={`nav-${item.href}`}
						aria-current={active ? "page" : undefined}
						className={cn(
							"rounded-full px-3 py-2 text-sm font-medium",
							active
								? "bg-muted text-foreground"
								: "text-muted-foreground hover:bg-accent hover:text-foreground",
						)}
					>
						{item.label}
					</Link>
				)
			})}
		</nav>
	)
}

interface MobileNavProps {
	id: string
	items: ReadonlyArray<NavItem>
	pathname: string | null
	onNavigate: () => void
}

function MobileNav({ id, items, pathname, onNavigate }: MobileNavProps) {
	return (
		<nav
			id={id}
			data-testid="mobile-nav"
			aria-label="Navegação móvel"
			className="border-t border-border md:hidden"
		>
			<ul className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
				{items.map((item) => {
					const active = isPathActive(pathname, item.href)
					return (
						<li key={item.href}>
							<Link
								href={item.href}
								onClick={onNavigate}
								aria-current={active ? "page" : undefined}
								className={cn(
									"block rounded-full px-3 py-2 text-sm font-medium",
									active
										? "bg-muted text-foreground"
										: "text-muted-foreground hover:bg-accent hover:text-foreground",
								)}
							>
								{item.label}
							</Link>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}

interface UserMenuProps {
	role: "MEMBER" | "ADMIN" | undefined
	onLogout: () => void
}

function UserMenu({ role, onLogout }: UserMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Menu de usuário"
				className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-card-foreground hover:bg-accent"
			>
				<User className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" sideOffset={8}>
				<DropdownMenuLabel>
					{role === "ADMIN" ? "Administrador" : "Membro"}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/perfil">Perfil</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href="/perfil/senha">Alterar senha</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={onLogout}>
					<LogOut className="h-4 w-4" />
					Sair
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export interface AuthenticatedShellProps {
	children: ReactNode
	className?: string
}

/**
 * AuthenticatedShell — shell para áreas protegidas.
 *
 * Header com navegação adaptativa (320px–1920px), menu de usuário
 * com guarda visual de role (admin) e ação de logout.
 */
export function AuthenticatedShell({
	children,
	className,
}: AuthenticatedShellProps) {
	const user = useAuthStore((state) => state.user)
	const router = useRouter()
	const pathname = usePathname()
	const [mobileOpen, setMobileOpen] = useState(false)
	const mobileNavId = useId()
	const logout = useLogout()

	const visibleItems = NAV_ITEMS.filter(
		(item) => !item.requiresRole || item.requiresRole === user?.role,
	)

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
				"flex min-h-screen flex-col bg-background text-foreground",
				className,
			)}
		>
			<header className="border-b border-border">
				<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
					<div className="flex items-center gap-4">
						<button
							type="button"
							aria-label={
								mobileOpen ? "Fechar menu" : "Abrir menu de navegação"
							}
							aria-expanded={mobileOpen}
							aria-controls={mobileNavId}
							onClick={() => setMobileOpen((open) => !open)}
							className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-foreground hover:bg-accent md:hidden"
						>
							{mobileOpen ? (
								<X className="h-5 w-5" />
							) : (
								<Menu className="h-5 w-5" />
							)}
						</button>
						<Link
							href="/perfil"
							className="font-display text-xl font-medium tracking-tight"
						>
							GymPass
						</Link>
					</div>

					<DesktopNav items={visibleItems} pathname={pathname} />

					<UserMenu role={user?.role} onLogout={handleLogout} />
				</div>

				{mobileOpen ? (
					<MobileNav
						id={mobileNavId}
						items={visibleItems}
						pathname={pathname}
						onNavigate={() => setMobileOpen(false)}
					/>
				) : null}
			</header>

			<main className="flex-1">
				<div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
					{children}
				</div>
			</main>
		</div>
	)
}
