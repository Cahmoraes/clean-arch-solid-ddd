"use client"
import { cn } from "@/lib/cn"
import { useMotionPreference } from "@/lib/motion-preference"

export interface MotionToggleProps {
	className?: string
}

export function MotionToggle({ className }: MotionToggleProps) {
	const { paused, toggle } = useMotionPreference()
	const label = paused ? "Retomar animações" : "Pausar animações"
	return (
		<button
			type="button"
			onClick={toggle}
			aria-pressed={paused}
			className={cn(
				"inline-flex h-9 items-center justify-center rounded-xs border border-border-strong px-3 font-display text-base",
				className,
			)}
		>
			{label}
		</button>
	)
}
