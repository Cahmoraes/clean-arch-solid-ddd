import type { HTMLAttributes } from "react"
import { cn } from "@/lib/cn"

/**
 * Skeleton — animated pulse placeholder. Container radius (12px) by default.
 */
export function Skeleton({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-testid="skeleton"
			className={cn("animate-pulse rounded-[12px] bg-light-gray", className)}
			{...props}
		/>
	)
}
