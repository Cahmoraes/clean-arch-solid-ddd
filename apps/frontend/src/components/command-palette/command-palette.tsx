"use client"

import { Command } from "cmdk"
import { Search } from "lucide-react"

interface CommandPaletteProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	return (
		<Command.Dialog
			open={open}
			onOpenChange={onOpenChange}
			shouldFilter={false}
			overlayClassName="fixed inset-0 z-40 bg-black/60"
			contentClassName="fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-pop focus:outline-none"
			aria-label="Paleta de comandos"
		>
			<div className="flex items-center gap-3 border-b border-border px-4">
				<Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
				<Command.Input
					placeholder="Buscar páginas, academias, usuários..."
					className="flex h-12 w-full bg-transparent py-3 text-sm text-foreground placeholder:text-subtle outline-none"
				/>
			</div>
			<Command.List className="max-h-[400px] overflow-y-auto py-2">
				<Command.Empty className="py-8 text-center text-sm text-subtle">
					Nenhum resultado encontrado.
				</Command.Empty>
			</Command.List>
		</Command.Dialog>
	)
}
