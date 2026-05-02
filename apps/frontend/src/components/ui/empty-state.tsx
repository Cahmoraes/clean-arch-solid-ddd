import type { ComponentType, ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface EmptyStateProps {
	icon?: ComponentType<{ className?: string }>
	title: string
	description?: string
	action?: ReactNode
	className?: string
}

/**
 * EmptyState — monochrome, container radius (12px), no shadows.
 * Used when a list/section has no data to render.
 */
export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				"flex flex-col items-center justify-center text-center gap-3 px-6 py-12 rounded-[12px] border border-light-gray bg-pure-white",
				className,
			)}
		>
			{Icon ? (
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-snow text-stone">
					<Icon className="h-6 w-6" />
				</div>
			) : null}
			<div className="flex flex-col gap-1">
				<h3 className="text-xl font-medium text-near-black font-display">
					{title}
				</h3>
				{description ? (
					<p className="text-sm text-stone max-w-sm">{description}</p>
				) : null}
			</div>
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	)
}
