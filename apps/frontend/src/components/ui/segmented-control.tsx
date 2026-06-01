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
	"aria-label"?: string
	countFloat?: boolean
}

function InlineBadge({ count, active }: { count: number; active: boolean }) {
	return (
		<span
			className={cn(
				"rounded-full px-1.5 py-0.5 font-mono text-[11.5px]",
				active
					? "bg-background/20 dark:bg-accent-foreground/20"
					: "bg-foreground/10",
			)}
		>
			{count}
		</span>
	)
}

function FloatBadge({ count }: { count: number }) {
	return (
		<span className="pointer-events-none absolute -right-1 -top-2 min-w-[18px] rounded-full border border-background bg-primary px-1 py-0 text-center font-mono text-[10px] font-bold leading-[18px] text-primary-foreground">
			{count}
		</span>
	)
}

export function SegmentedControl<T extends string = string>({
	items,
	value,
	onValueChange,
	className,
	"aria-label": ariaLabel,
	countFloat = false,
}: SegmentedControlProps<T>) {
	return (
		<fieldset
			aria-label={ariaLabel}
			className={cn(
				"m-0 flex w-fit min-w-0 max-w-full flex-wrap gap-1.5 rounded-md border border-border bg-surface-2 p-1.5",
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
							countFloat && "relative",
						)}
					>
						{item.label}
						{typeof item.count === "number" && !countFloat && (
							<InlineBadge count={item.count} active={active} />
						)}
						{typeof item.count === "number" && countFloat && (
							<FloatBadge count={item.count} />
						)}
					</button>
				)
			})}
		</fieldset>
	)
}
