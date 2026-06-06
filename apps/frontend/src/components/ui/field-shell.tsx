"use client"

import type { ReactNode } from "react"

/**
 * Classe de estilo compartilhada para inputs mascarados (react-imask),
 * espelhando o componente Input base alinhado ao DESIGN.md.
 */
export const MASKED_INPUT_CLASS = [
	"flex h-10 w-full rounded-md border border-input bg-background px-4 py-2 text-base text-foreground",
	"placeholder:text-muted-foreground",
	"transition-colors",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
	"disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

/**
 * FieldShell — par label + conteúdo (input) + alerta de erro acessível.
 * Usado pelos campos mascarados que não podem reaproveitar FormField
 * por renderizarem um IMaskInput em vez do Input base.
 */
export function FieldShell({
	id,
	label,
	error,
	children,
}: {
	id: string
	label: ReactNode
	error?: string | null
	children: ReactNode
}) {
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="text-sm font-medium text-foreground">
				{label}
			</label>
			{children}
			{error ? (
				<p id={`${id}-error`} role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
		</div>
	)
}
