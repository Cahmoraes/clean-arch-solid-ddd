import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import { Eyebrow } from "./eyebrow"

export interface PageHeaderProps {
	title: string
	eyebrow?: string
	subtitle?: string
	action?: ReactNode
	className?: string
}

export function PageHeader({
	title,
	eyebrow,
	subtitle,
	action,
	className,
}: PageHeaderProps) {
	return (
		<div
			className={cn(
				"mb-8 flex flex-wrap items-start justify-between gap-4",
				className,
			)}
		>
			<div className="flex flex-col gap-2">
				{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
				<h1 className="font-display text-[30px] font-semibold tracking-tight">
					{title}
				</h1>
				{subtitle && <p className="text-muted-foreground">{subtitle}</p>}
			</div>
			{action && <div className="flex items-center gap-2">{action}</div>}
		</div>
	)
}
