"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/cn"

const TRANSITION_MS = 300

export interface AnimatedPanelProps {
	open: boolean
	children: ReactNode
	className?: string
}

export function AnimatedPanel({
	open,
	children,
	className,
}: AnimatedPanelProps) {
	const [shouldRender, setShouldRender] = useState(open)
	const [entered, setEntered] = useState(false)
	const lastChildrenRef = useRef<ReactNode>(children)

	if (open) {
		lastChildrenRef.current = children
	}

	useEffect(() => {
		let raf: number | undefined
		let timeout: ReturnType<typeof setTimeout> | undefined
		if (open) {
			setShouldRender(true)
			raf = requestAnimationFrame(() => setEntered(true))
		} else {
			setEntered(false)
			timeout = setTimeout(() => setShouldRender(false), TRANSITION_MS)
		}
		return () => {
			if (raf !== undefined) cancelAnimationFrame(raf)
			if (timeout !== undefined) clearTimeout(timeout)
		}
	}, [open])

	if (!shouldRender) return null

	return (
		<div
			className={cn(
				"transition-[opacity,transform] duration-300 ease-in-out",
				entered
					? "opacity-100 translate-y-0 scale-100"
					: "opacity-0 translate-y-2 scale-[0.98]",
				className,
			)}
		>
			{open ? children : lastChildrenRef.current}
		</div>
	)
}
