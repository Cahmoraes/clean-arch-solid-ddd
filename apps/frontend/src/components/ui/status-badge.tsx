import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

type StatusTone = "success" | "warning" | "danger" | "neutral"

const TONE_CLASSES: Record<StatusTone, string> = {
	success: "bg-success-soft text-success",
	warning: "bg-warning-soft text-warning",
	danger: "bg-destructive-soft text-destructive",
	neutral: "bg-surface-2 text-muted-foreground border border-border",
}

export interface StatusBadgeProps {
	tone: StatusTone
	children: ReactNode
	className?: string
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
				TONE_CLASSES[tone],
				className,
			)}
		>
			<span
				className="h-1.5 w-1.5 rounded-full bg-current"
				aria-hidden="true"
			/>
			{children}
		</span>
	)
}
