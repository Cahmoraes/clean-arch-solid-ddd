"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"

const THEME_CONFIG = {
	dark: {
		next: "light" as const,
		ariaLabel: "Ativar modo claro",
		pillLeft: "left-[31px]",
		Icon: Moon,
	},
	light: {
		next: "dark" as const,
		ariaLabel: "Ativar modo escuro",
		pillLeft: "left-[5px]",
		Icon: Sun,
	},
}

export interface ThemeToggleProps {
	className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
	const { theme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) return null

	const isDark = theme === "dark"
	const { next, ariaLabel, pillLeft, Icon } =
		THEME_CONFIG[isDark ? "dark" : "light"]

	return (
		<button
			type="button"
			onClick={() => setTheme(next)}
			aria-label={ariaLabel}
			aria-pressed={isDark}
			className={cn(
				"relative inline-flex h-[38px] w-16 items-center rounded-full border border-border bg-surface-2 p-1.5",
				className,
			)}
		>
			<span
				className={cn(
					"absolute top-[5px] z-[2] inline-flex h-[28px] w-[28px] items-center justify-center rounded-full bg-accent text-accent-foreground transition-[left] duration-300",
					pillLeft,
				)}
			>
				<Icon
					key={isDark ? "moon" : "sun"}
					className="theme-toggle-icon h-3.5 w-3.5 flex-shrink-0"
					aria-hidden="true"
				/>
			</span>
		</button>
	)
}
