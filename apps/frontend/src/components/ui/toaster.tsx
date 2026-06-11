"use client"

import { Toaster as SonnerToaster, type ToasterProps } from "sonner"

/**
 * Toaster — Sonner customized to the monochrome design system.
 */
export function Toaster(props: ToasterProps) {
	return (
		<SonnerToaster
			position="top-right"
			toastOptions={{
				classNames: {
					toast:
						"rounded-[12px] border border-border bg-card text-card-foreground shadow-none",
					title: "text-card-foreground font-medium",
					description: "text-muted-foreground",
					actionButton:
						"rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm",
					cancelButton:
						"rounded-md bg-secondary text-secondary-foreground px-3 py-1 text-sm",
				},
			}}
			{...props}
		/>
	)
}
