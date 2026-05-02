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
						"rounded-[12px] border border-light-gray bg-pure-white text-near-black shadow-none",
					title: "text-near-black font-medium",
					description: "text-stone",
					actionButton:
						"rounded-full bg-pure-black text-pure-white px-3 py-1 text-sm",
					cancelButton:
						"rounded-full bg-light-gray text-near-black px-3 py-1 text-sm",
				},
			}}
			{...props}
		/>
	)
}
