"use client"

import { Pause, Play } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"
import { useUserMotionPause } from "@/lib/hooks/use-scene-motion"

export interface MotionToggleProps {
	className?: string
	compact?: boolean
}

export function MotionToggle({ className, compact }: MotionToggleProps) {
	const { userPaused, toggleUserPause } = useUserMotionPause()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) return null

	const Icon = userPaused ? Play : Pause
	const label = userPaused ? "Retomar animações" : "Pausar animações"

	return (
		<button
			type="button"
			onClick={toggleUserPause}
			aria-label={label}
			aria-pressed={userPaused}
			className={cn(
				"focus-ring-duplo inline-flex items-center justify-center rounded-sm",
				compact
					? "h-9 w-9 bg-accent text-accent-foreground"
					: "h-[38px] w-[38px] border border-border bg-surface-2 text-foreground",
				className,
			)}
		>
			<Icon className="h-4 w-4" aria-hidden="true" />
		</button>
	)
}
