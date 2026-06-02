import { Search } from "lucide-react"
import type {
	InputHTMLAttributes,
	KeyboardEvent,
	MouseEventHandler,
} from "react"
import { cn } from "@/lib/cn"

export interface SearchBarProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "onClick"> {
	className?: string
	showShortcut?: boolean
	onClick?: MouseEventHandler<HTMLDivElement>
}

export function SearchBar({
	className,
	showShortcut = false,
	onClick,
	...inputProps
}: SearchBarProps) {
	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (onClick && (event.key === "Enter" || event.key === " ")) {
			event.preventDefault()
			onClick(event as unknown as React.MouseEvent<HTMLDivElement>)
		}
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: role="presentation" wrapper delegates to inner input; onClick opens command palette
		<div
			role={onClick ? "presentation" : undefined}
			onClick={onClick}
			onKeyDown={onClick ? handleKeyDown : undefined}
			className={cn(
				"flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle",
				onClick && "cursor-pointer",
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
