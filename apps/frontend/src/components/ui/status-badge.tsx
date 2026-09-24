import type { ReactNode } from "react"
import { STATUS_ICON, type StatusIconTone } from "@/components/ui/status-icon"
import { cn } from "@/lib/cn"

type StatusTone = "success" | "warning" | "danger" | "neutral"

const TONE_CLASSES: Record<StatusTone, string> = {
	success: "bg-success-soft text-success",
	warning: "bg-warning-soft text-warning",
	danger: "bg-destructive-soft text-destructive",
	neutral: "bg-surface-2 text-muted-foreground border border-border",
}

export type StatusBadgeVariant = "pill" | "stripe"

export interface StatusBadgeProps {
	tone: StatusTone
	children: ReactNode
	className?: string
	variant?: StatusBadgeVariant
}

const STRIPE_BORDER_CLASSES: Record<StatusTone, string> = {
	success: "border-l-success",
	warning: "border-l-warning",
	danger: "border-l-destructive",
	neutral: "border-l-border-strong",
}

export function statusStripeBorderClass(tone: StatusTone): string {
	return STRIPE_BORDER_CLASSES[tone]
}

function isIconTone(tone: StatusTone): tone is StatusIconTone {
	return tone !== "neutral"
}

export function StatusBadge({
	tone,
	children,
	className,
	variant = "pill",
}: StatusBadgeProps) {
	if (variant === "stripe") {
		return <span className={cn("sr-only", className)}>{children}</span>
	}
	const Icon = isIconTone(tone) ? STATUS_ICON[tone] : null
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold",
				TONE_CLASSES[tone],
				className,
			)}
		>
			{Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
			{children}
		</span>
	)
}
