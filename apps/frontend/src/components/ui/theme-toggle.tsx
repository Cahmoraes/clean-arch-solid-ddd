"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"

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

	return (
		<button
			type="button"
			onClick={() => setTheme(isDark ? "light" : "dark")}
			aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
			aria-pressed={isDark}
			className={cn(
				"relative inline-flex h-[42px] w-[132px] items-center rounded-full border border-border bg-surface-2 p-1 max-[860px]:w-[42px]",
				className,
			)}
		>
			<span
				className={cn(
					"absolute top-1 z-[2] inline-flex h-8 w-[34px] items-center justify-center rounded-full bg-accent text-accent-foreground transition-[left] duration-300",
					isDark ? "left-[calc(100%-38px)] max-[860px]:left-1" : "left-1",
				)}
			>
				{isDark ? (
					<Moon className="h-4 w-4" aria-hidden="true" />
				) : (
					<Sun className="h-4 w-4" aria-hidden="true" />
				)}
			</span>
			<span className="flex-1 pl-[22px] text-center text-xs font-semibold text-subtle max-[860px]:hidden">
				Claro
			</span>
			<span className="flex-1 pr-[22px] text-center text-xs font-semibold text-subtle max-[860px]:hidden">
				Escuro
			</span>
		</button>
	)
}
