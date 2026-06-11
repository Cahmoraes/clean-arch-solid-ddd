import type { ReactNode } from "react"

declare module "next-themes" {
	interface ThemeProviderProps {
		children?: ReactNode
	}
}
