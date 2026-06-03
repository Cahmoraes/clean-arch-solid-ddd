"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"

const THEME_CONFIG = {
	dark: {
		next: "light" as const,
		ariaLabel: "Ativar modo claro",
		pillLeft: "left-[calc(100%-72px)] max-[860px]:left-[5px]",
		Icon: Moon,
		activeLabel: "Escuro",
		claroClass: "text-subtle",
		escuroClass: "select-none text-transparent",
	},
	light: {
		next: "dark" as const,
		ariaLabel: "Ativar modo escuro",
		pillLeft: "left-[5px]",
		Icon: Sun,
		activeLabel: "Claro",
		claroClass: "select-none text-transparent",
		escuroClass: "text-subtle",
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
	const {
		next,
		ariaLabel,
		pillLeft,
		Icon,
		activeLabel,
		claroClass,
		escuroClass,
	} = THEME_CONFIG[isDark ? "dark" : "light"]

	return (
		<button
			type="button"
			onClick={() => setTheme(next)}
			aria-label={ariaLabel}
			aria-pressed={isDark}
			className={cn(
				"relative inline-flex h-[38px] w-[128px] items-center rounded-full border border-border bg-surface-2 p-1.5 max-[860px]:w-[38px]",
				className,
			)}
		>
			<span
				className={cn(
					"absolute top-[5px] z-[2] inline-flex h-[28px] min-w-[66px] items-center justify-center gap-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold transition-[left] duration-300",
					"max-[860px]:min-w-0 max-[860px]:w-[28px] max-[860px]:gap-0",
					pillLeft,
				)}
			>
				<Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
				<span className="max-[860px]:hidden">{activeLabel}</span>
			</span>
			<span
				className={cn(
					"flex-1 pl-2 text-center text-xs font-semibold max-[860px]:hidden",
					claroClass,
				)}
				aria-hidden="true"
			>
				Claro
			</span>
			<span
				className={cn(
					"flex-1 pr-2 text-center text-xs font-semibold max-[860px]:hidden",
					escuroClass,
				)}
				aria-hidden="true"
			>
				Escuro
			</span>
		</button>
	)
}
