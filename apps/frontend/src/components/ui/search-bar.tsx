import { Search } from "lucide-react"
import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export interface SearchBarProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
	className?: string
	/** Exibe a dica de atalho ⌘K à direita. Default: false. */
	showShortcut?: boolean
}

export function SearchBar({
	className,
	showShortcut = false,
	...inputProps
}: SearchBarProps) {
	return (
		<div
			className={cn(
				"flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle",
				className,
			)}
		>
			<Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
			<input
				type="search"
				className="h-full flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
				{...inputProps}
			/>
			{showShortcut && (
				<kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-subtle">
					⌘K
				</kbd>
			)}
		</div>
	)
}
