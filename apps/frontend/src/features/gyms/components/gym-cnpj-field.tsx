"use client"

import { IMaskInput } from "react-imask"
import { FieldShell, MASKED_INPUT_CLASS } from "@/components/ui/field-shell"

export interface GymCnpjFieldProps {
	id: string
	value: string
	onAccept: (value: string) => void
	onBlur?: () => void
	error?: string | null
	testId?: string
}

/**
 * Campo de CNPJ com máscara 00.000.000/0000-00. Armazena apenas dígitos
 * (`unmask`), preservando a validação Zod e o contrato com o backend.
 */
export function GymCnpjField({
	id,
	value,
	onAccept,
	onBlur,
	error,
	testId,
}: GymCnpjFieldProps) {
	return (
		<FieldShell id={id} label="CNPJ" error={error}>
			<IMaskInput
				id={id}
				mask="00.000.000/0000-00"
				unmask
				value={value}
				onAccept={onAccept}
				onBlur={onBlur}
				inputMode="numeric"
				placeholder="00.000.000/0000-00"
				data-testid={testId}
				aria-invalid={Boolean(error) || undefined}
				aria-describedby={error ? `${id}-error` : undefined}
				className={MASKED_INPUT_CLASS}
			/>
		</FieldShell>
	)
}
