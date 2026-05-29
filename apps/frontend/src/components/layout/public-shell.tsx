import Link from "next/link"
import type { ReactNode } from "react"
import { BrandMark } from "@/components/ui/brand-mark"
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
			<header className="border-b border-border">
				<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
					<Link href="/" aria-label="Página inicial VOLT">
						<BrandMark />
					</Link>
					<nav
						aria-label="Ações de autenticação"
						className="flex items-center gap-2"
					>
						<Link
							href="/login"
							className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
						>
							Entrar
						</Link>
						<Link
							href="/cadastro"
							className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-primary-strong"
						>
							Criar conta
						</Link>
					</nav>
				</div>
			</header>
			<main className="flex-1">{children}</main>
			<footer className="border-t border-border">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<span>© {new Date().getFullYear()} VOLT</span>
					<span>Plataforma de acesso a academias</span>
				</div>
			</footer>
		</div>
	)
}
