import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface PublicShellProps {
	children: ReactNode
	className?: string
}

export function PublicShell({ children, className }: PublicShellProps) {
	return (
		<div
			data-testid="public-shell"
			className={cn(
				"flex min-h-screen flex-col bg-background text-foreground",
				className,
			)}
		>
			<header className="bg-primary dark:bg-card dark:border-b dark:border-border">
				<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
					<Link
						href="/"
						aria-label="Página inicial"
						className="font-display text-xl font-semibold tracking-tight text-primary-foreground dark:text-card-foreground"
					>
						GymPass
					</Link>
					<nav
						aria-label="Ações de autenticação"
						className="flex items-center gap-2"
					>
						<Link
							href="/login"
							className="rounded-md border border-primary-foreground/30 dark:border-card-foreground/30 px-4 py-2 text-sm font-medium text-primary-foreground dark:text-card-foreground hover:bg-primary-foreground/10 dark:hover:bg-card-foreground/10 transition-colors"
						>
							Entrar
						</Link>
						<Link
							href="/cadastro"
							className="rounded-md border border-primary-foreground dark:border-card-foreground bg-primary-foreground dark:bg-card-foreground px-4 py-2 text-sm font-medium text-primary dark:text-card hover:bg-primary-foreground/90 dark:hover:bg-card-foreground/90 transition-colors"
						>
							Criar conta
						</Link>
					</nav>
				</div>
			</header>
			<main className="flex-1">{children}</main>
			<footer className="border-t border-border">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<span>© {new Date().getFullYear()} GymPass</span>
					<span>Plataforma de acesso a academias</span>
				</div>
			</footer>
		</div>
	)
}
