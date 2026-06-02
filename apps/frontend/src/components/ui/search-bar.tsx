"use client"

import { Search } from "lucide-react"
import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export interface SearchBarProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
	className?: string
	showShortcut?: boolean
	/**
	 * When provided, renders as a keyboard-accessible button that triggers
	 * the Command Palette. The inner input is replaced with a decorative span.
	 */
	onActivate?: () => void
}

export function SearchBar({
	className,
	showShortcut = false,
	onActivate,
	placeholder,
	...inputProps
}: SearchBarProps) {
	const baseClasses = cn(
		"flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle",
		className,
	)

	if (onActivate) {
		return (
			<button
				type="button"
				onClick={onActivate}
				className={cn(baseClasses, "cursor-pointer")}
			>
				<Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
				<span className="flex-1 truncate text-left text-[15px] text-subtle">
					{placeholder}
				</span>
				{showShortcut && (
					<kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-subtle">
						⌘K
					</kbd>
				)}
			</button>
		)
	}

	return (
		<div className={baseClasses}>
			<Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
			<input
				type="search"
				placeholder={placeholder}
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
