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
				"font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-subtle",
				className,
			)}
		>
			{children}
		</span>
	)
}
