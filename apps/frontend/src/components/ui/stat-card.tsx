import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"

export interface StatDelta {
	value: string
	direction: "up" | "down"
}

export interface StatCardProps {
	icon: LucideIcon
	value: string
	label: string
	delta?: StatDelta
	/** Destaca o ícone com fundo accent. Default: false. */
	highlight?: boolean
	className?: string
}

export function StatCard({
	icon: Icon,
	value,
	label,
	delta,
	highlight = false,
	className,
}: StatCardProps) {
	return (
		<div
			className={cn(
				"rounded-lg border border-border bg-card p-[22px] shadow-sm",
				className,
			)}
		>
			<div className="mb-[18px] flex items-center justify-between">
				<span
					className={cn(
						"inline-flex h-[42px] w-[42px] items-center justify-center rounded-md",
						highlight
							? "bg-accent text-accent-foreground"
							: "bg-surface-2 text-muted-foreground",
					)}
				>
					<Icon className="h-5 w-5" aria-hidden="true" />
				</span>
				{delta && (
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[12.5px] font-bold",
							delta.direction === "up"
								? "bg-success-soft text-success"
								: "bg-destructive-soft text-destructive",
						)}
					>
						{delta.value}
					</span>
				)}
			</div>
			<p className="font-mono text-[38px] font-bold leading-none tracking-tight tabular">
				{value}
			</p>
			<p className="mt-2 text-sm text-muted-foreground">{label}</p>
		</div>
	)
}
