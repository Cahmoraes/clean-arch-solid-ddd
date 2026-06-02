import { Search } from "lucide-react"
import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export interface SearchBarProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
	className?: string
	showShortcut?: boolean
	/**
	 * When provided, renders the wrapper as a keyboard-accessible trigger
	 * (role="button", tabIndex=0) that opens the Command Palette.
	 * The inner input becomes non-interactive (tabIndex=-1, readOnly).
	 */
	onActivate?: () => void
}

const INNER_CLASS =
	"h-full flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"

function SearchBarInner({
	showShortcut,
	inputProps,
	isTrigger,
}: {
	showShortcut: boolean
	inputProps: InputHTMLAttributes<HTMLInputElement>
	isTrigger: boolean
}) {
	return (
		<>
			<Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
			<input
				type="search"
				className={INNER_CLASS}
				tabIndex={isTrigger ? -1 : undefined}
				readOnly={isTrigger || undefined}
				{...inputProps}
			/>
			{showShortcut && (
				<kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-subtle">
					⌘K
				</kbd>
			)}
		</>
	)
}

export function SearchBar({
	className,
	showShortcut = false,
	onActivate,
	...inputProps
}: SearchBarProps) {
	const wrapperClass = cn(
		"flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle",
		className,
	)

	if (onActivate) {
		return (
			<button
				type="button"
				onClick={onActivate}
				className={cn(wrapperClass, "cursor-pointer")}
			>
				<SearchBarInner
					showShortcut={showShortcut}
					inputProps={inputProps}
					isTrigger
				/>
			</button>
		)
	}

	return (
		<div className={wrapperClass}>
			<SearchBarInner
				showShortcut={showShortcut}
				inputProps={inputProps}
				isTrigger={false}
			/>
		</div>
	)
}
