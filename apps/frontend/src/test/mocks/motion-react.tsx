import { createElement, type ReactEventHandler, type ReactNode } from "react"

function stripMotionProps(props: Record<string, unknown>) {
	const {
		whileHover: _whileHover,
		whileTap: _whileTap,
		initial: _initial,
		animate: _animate,
		exit: _exit,
		transition: _transition,
		variants: _variants,
		layout: _layout,
		onLoad,
		children,
		...rest
	} = props

	return { children, onLoad, rest }
}

export const motion = {
	div: (props: Record<string, unknown>) => {
		const { children, rest } = stripMotionProps(props)
		return <div {...rest}>{children as ReactNode}</div>
	},
	ul: (props: Record<string, unknown>) => {
		const { children, rest } = stripMotionProps(props)
		return <ul {...rest}>{children as ReactNode}</ul>
	},
	li: (props: Record<string, unknown>) => {
		const { children, rest } = stripMotionProps(props)
		return <li {...rest}>{children as ReactNode}</li>
	},
	img: (props: Record<string, unknown>) => {
		const { onLoad, rest } = stripMotionProps(props)
		const alt =
			typeof rest.alt === "string" || rest.alt === undefined
				? rest.alt
				: undefined

		return createElement("img", {
			...rest,
			alt: alt ?? "",
			onLoad: onLoad as ReactEventHandler<HTMLImageElement>,
		})
	},
}

export function AnimatePresence({ children }: { children: ReactNode }) {
	return <>{children}</>
}

interface MotionConfigProps {
	children: ReactNode
	reducedMotion?: "always" | "never" | "user"
}

export function MotionConfig({ children }: MotionConfigProps) {
	return <>{children}</>
}
