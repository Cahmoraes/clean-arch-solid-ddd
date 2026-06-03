import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/cn"

export type PageContainerWidth = "wide" | "default" | "narrow"

const WIDTH_CLASSES: Record<PageContainerWidth, string> = {
	wide: "",
	default: "max-w-4xl",
	narrow: "max-w-2xl",
}

export interface PageContainerProps {
	width?: PageContainerWidth
	as?: ElementType
	className?: string
	children: ReactNode
	id?: string
	"aria-label"?: string
	"aria-labelledby"?: string
	"aria-busy"?: boolean | "true" | "false"
	"data-testid"?: string
}

export function PageContainer({
	width = "default",
	as: Component = "div",
	className,
	children,
	"data-testid": testId = "page-container",
	...rest
}: PageContainerProps) {
	return (
		<Component
			data-testid={testId}
			data-width={width}
			className={cn(
				"flex w-full flex-col gap-8",
				WIDTH_CLASSES[width],
				className,
			)}
			{...rest}
		>
			{children}
		</Component>
	)
}
