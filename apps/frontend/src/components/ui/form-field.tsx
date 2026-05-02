"use client"

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"

export interface FormFieldProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
	id: string
	label: ReactNode
	error?: string | null
	containerClassName?: string
}

/**
 * FormField — pares label + Input + alerta de erro acessível, alinhado
 * ao DESIGN.md. Centraliza repetição de boilerplate dos formulários
 * de auth (login, cadastro, alterar senha).
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
	({ id, label, error, containerClassName, ...inputProps }, ref) => {
		const errorId = error ? `${id}-error` : undefined
		return (
			<div className={cn("flex flex-col gap-2", containerClassName)}>
				<label htmlFor={id} className="text-sm font-medium text-near-black">
					{label}
				</label>
				<Input
					ref={ref}
					id={id}
					aria-invalid={Boolean(error) || undefined}
					aria-describedby={errorId}
					{...inputProps}
				/>
				{error ? (
					<p id={errorId} role="alert" className="text-sm text-near-black">
						{error}
					</p>
				) : null}
			</div>
		)
	},
)
FormField.displayName = "FormField"
