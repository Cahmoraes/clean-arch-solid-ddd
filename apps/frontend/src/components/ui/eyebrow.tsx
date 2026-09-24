import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface EyebrowProps {
	children: ReactNode
	className?: string
}

export function Eyebrow({ children, className }: EyebrowProps) {
	return (
		<span
			className={cn(
				"font-display text-[15px] font-normal uppercase tracking-[0.12em] text-accent",
				className,
			)}
		>
			{children}
		</span>
	)
}
