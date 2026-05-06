import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface PublicShellProps {
	children: ReactNode
	className?: string
}

/**
 * PublicShell — shell mínimo para superfícies não autenticadas.
 *
 * Header monocromático com logotipo textual e CTAs para login/cadastro.
 * Server Component (sem `"use client"`).
 */
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
					<Link
						href="/"
						aria-label="Página inicial"
						className="font-display text-xl font-medium tracking-tight"
					>
						GymPass
					</Link>
					<nav
						aria-label="Ações de autenticação"
						className="flex items-center gap-2"
					>
						<Link
							href="/login"
							className="rounded-full border border-transparent px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
						>
							Entrar
						</Link>
						<Link
							href="/cadastro"
							className="rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
					<span>Frontend monocromático inspirado em Ollama</span>
				</div>
			</footer>
		</div>
	)
}
