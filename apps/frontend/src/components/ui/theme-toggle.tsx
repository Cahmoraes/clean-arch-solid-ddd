"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, type PixelIcon, Sun, Sunset } from "@/components/ui/pixel-icons"
import { cn } from "@/lib/cn"

type ThemeName = "dark" | "sunset" | "light"

const THEME_ORDER: readonly ThemeName[] = ["dark", "sunset", "light"]

const THEME_OPTIONS: Record<
	ThemeName,
	{ label: string; ariaLabel: string; Icon: PixelIcon }
> = {
	dark: { label: "Neon", ariaLabel: "Tema Neon", Icon: Moon },
	sunset: { label: "Pôr do sol", ariaLabel: "Tema Pôr do sol", Icon: Sunset },
	light: { label: "Neblina", ariaLabel: "Tema Neblina", Icon: Sun },
}

function resolveThemeName(theme: string | undefined): ThemeName {
	if (theme === "dark" || theme === "sunset" || theme === "light") return theme
	return "dark"
}

function nextTheme(current: ThemeName): ThemeName {
	const index = THEME_ORDER.indexOf(current)
	return THEME_ORDER[(index + 1) % THEME_ORDER.length]
}

export interface ThemeToggleProps {
	className?: string
	compact?: boolean
}

export function ThemeToggle({ className, compact }: ThemeToggleProps) {
	const { resolvedTheme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)
	useEffect(() => {
		setMounted(true)
	}, [])
	if (!mounted) return null

	const current = resolveThemeName(resolvedTheme)

	if (compact) {
		const upcoming = nextTheme(current)
		const { Icon } = THEME_OPTIONS[current]
		return (
			<button
				type="button"
				onClick={() => setTheme(upcoming)}
				aria-label={`Ativar tema ${THEME_OPTIONS[upcoming].label}`}
				className={cn(
					"inline-flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground",
					className,
				)}
			>
				<Icon
					key={current}
					className="h-4 w-4 flex-shrink-0"
					aria-hidden="true"
				/>
			</button>
		)
	}

	return (
		<div
			role="radiogroup"
			aria-label="Tema"
			className={cn(
				"inline-flex items-center gap-1 rounded-xs border border-border bg-surface-2 p-1.5",
				className,
			)}
		>
			{THEME_ORDER.map((name) => {
				const { ariaLabel, Icon } = THEME_OPTIONS[name]
				const checked = name === current
				return (
					// biome-ignore lint/a11y/useSemanticElements: botão-ícone pixel-art no vocabulário ARIA do Radix RadioGroup; <input type="radio"> não comporta o ícone SVG nem o estilo do design system
					<button
						key={name}
						type="button"
						role="radio"
						aria-checked={checked}
						aria-label={ariaLabel}
						onClick={() => setTheme(name)}
						className={cn(
							"inline-flex h-[28px] w-[28px] items-center justify-center rounded-xs",
							checked ? "bg-accent text-accent-foreground" : "text-foreground",
						)}
					>
						<Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
					</button>
				)
			})}
		</div>
	)
}
