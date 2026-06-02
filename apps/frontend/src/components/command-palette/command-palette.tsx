"use client"

import { Content, Overlay, Portal, Root, Title } from "@radix-ui/react-dialog"
import { Command } from "cmdk"
import { Search } from "lucide-react"
import { useState } from "react"
import { useAuthStore } from "@/lib/auth/auth-store"
import { GymGroup } from "./gym-group"
import { NavigationGroup } from "./navigation-group"
import { useGlobalSearch } from "./use-global-search"
import { UserGroup } from "./user-group"

interface CommandPaletteProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const [query, setQuery] = useState("")
	const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN")
	const { debouncedQuery, isActive } = useGlobalSearch(query)

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) setQuery("")
		onOpenChange(nextOpen)
	}

	return (
		<Root open={open} onOpenChange={handleOpenChange}>
			<Portal>
				<Overlay className="fixed inset-0 z-40 bg-black/60" />
				<Content
					className="fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-sidebar shadow-pop focus:outline-none"
					aria-describedby={undefined}
				>
					<Title className="sr-only">Paleta de comandos</Title>
					<Command
						shouldFilter={false}
						className="flex flex-col font-mono [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-subtle"
					>
						<div className="flex items-center gap-3 border-b border-border px-4">
							<Search
								className="h-4 w-4 shrink-0 text-subtle"
								aria-hidden="true"
							/>
							<Command.Input
								value={query}
								onValueChange={setQuery}
								placeholder="Buscar páginas, academias, usuários..."
								className="flex h-12 w-full bg-transparent py-3 text-sm text-foreground placeholder:text-subtle outline-none"
							/>
						</div>
						<Command.List className="max-h-[400px] overflow-y-auto py-2">
							<Command.Empty className="py-8 text-center text-sm text-subtle">
								Nenhum resultado encontrado.
							</Command.Empty>

							<NavigationGroup
								query={query}
								onSelect={() => handleOpenChange(false)}
							/>

							<GymGroup
								query={debouncedQuery}
								isActive={isActive}
								onSelect={() => handleOpenChange(false)}
							/>

							{isAdmin && (
								<UserGroup
									query={debouncedQuery}
									isActive={isActive}
									onSelect={() => handleOpenChange(false)}
								/>
							)}
						</Command.List>
					</Command>
				</Content>
			</Portal>
		</Root>
	)
}
