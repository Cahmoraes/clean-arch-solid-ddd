import { Search } from "lucide-react"
import type { InputHTMLAttributes, MouseEventHandler } from "react"
import { cn } from "@/lib/cn"

export interface SearchBarProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "onClick"> {
	className?: string
	/** Exibe a dica de atalho ⌘K à direita. Default: false. */
	showShortcut?: boolean
	/** Callback acionado ao clicar no wrapper (usado para abrir o Command Palette). */
	onClick?: MouseEventHandler<HTMLButtonElement>
}

const wrapperBase =
	"flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle"

const innerContent = (
	showShortcut: boolean,
	inputProps: Omit<
		InputHTMLAttributes<HTMLInputElement>,
		"className" | "onClick"
	>,
) => (
	<>
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
	</>
)

export function SearchBar({
	className,
	showShortcut = false,
	onClick,
	...inputProps
}: SearchBarProps) {
	if (onClick) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={cn(
					wrapperBase,
					"cursor-pointer w-full text-left",
					className,
				)}
			>
				{innerContent(showShortcut, inputProps)}
			</button>
		)
	}

	return (
		<div className={cn(wrapperBase, className)}>
			{innerContent(showShortcut, inputProps)}
		</div>
	)
}
