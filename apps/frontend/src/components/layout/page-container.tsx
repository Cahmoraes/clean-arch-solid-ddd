import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"
import { cn } from "@/lib/cn"

export type PageContainerWidth = "wide" | "default" | "narrow"

const WIDTH_CLASSES: Record<PageContainerWidth, string> = {
	wide: "",
	default: "max-w-4xl",
	narrow: "max-w-2xl",
}

type PageContainerOwnProps<T extends ElementType> = {
	width?: PageContainerWidth
	as?: T
	className?: string
	children: ReactNode
	"data-testid"?: string
}

export type PageContainerProps<T extends ElementType = "div"> =
	PageContainerOwnProps<T> &
		Omit<ComponentPropsWithoutRef<T>, keyof PageContainerOwnProps<T>>

export function PageContainer<T extends ElementType = "div">({
	width = "default",
	as,
	className,
	children,
	"data-testid": testId = "page-container",
	...rest
}: PageContainerProps<T>) {
	const Component: ElementType = as ?? "div"
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
