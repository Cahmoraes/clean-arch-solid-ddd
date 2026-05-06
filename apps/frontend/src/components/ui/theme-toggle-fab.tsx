"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggleFAB() {
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
			className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-105 active:scale-95"
			aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
		>
			{isDark ? "☀️" : "🌙"}
		</button>
	)
}
