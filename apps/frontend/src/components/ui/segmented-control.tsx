import { cn } from "@/lib/cn"

export interface SegmentedItem<T extends string = string> {
	value: T
	label: string
	count?: number
}

export interface SegmentedControlProps<T extends string = string> {
	items: ReadonlyArray<SegmentedItem<T>>
	value: T
	onValueChange: (value: T) => void
	className?: string
}

export function SegmentedControl<T extends string = string>({
	items,
	value,
	onValueChange,
	className,
}: SegmentedControlProps<T>) {
	return (
		<div
			className={cn(
				"flex w-fit max-w-full flex-wrap gap-1.5 rounded-md border border-border bg-surface-2 p-1.5",
				className,
			)}
		>
			{items.map((item) => {
				const active = item.value === value
				return (
					<button
						key={item.value}
						type="button"
						aria-pressed={active}
						onClick={() => onValueChange(item.value)}
						className={cn(
							"inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
							active
								? "bg-foreground text-background dark:bg-accent dark:text-accent-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{item.label}
						{typeof item.count === "number" && (
							<span
								className={cn(
									"rounded-full px-1.5 py-0.5 font-mono text-[11.5px]",
									active
										? "bg-background/20 dark:bg-accent-foreground/20"
										: "bg-foreground/10",
								)}
							>
								{item.count}
							</span>
						)}
					</button>
				)
			})}
		</div>
	)
}
