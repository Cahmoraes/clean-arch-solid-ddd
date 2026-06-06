"use client"

import { IMaskInput } from "react-imask"
import { FieldShell, MASKED_INPUT_CLASS } from "@/components/ui/field-shell"

export interface GymPhoneFieldProps {
	id: string
	value: string
	onAccept: (value: string) => void
	onBlur?: () => void
	error?: string | null
	testId?: string
}

// Telefone brasileiro: fixo (10 dígitos) ou celular (11 dígitos). O react-imask
// alterna automaticamente entre as máscaras conforme a quantidade de dígitos.
const PHONE_MASK = [{ mask: "(00) 0000-0000" }, { mask: "(00) 00000-0000" }]

/**
 * Campo de telefone com máscara brasileira. Armazena apenas dígitos (`unmask`),
 * preservando a validação Zod e o contrato com o backend.
 */
export function GymPhoneField({
	id,
	value,
	onAccept,
	onBlur,
	error,
	testId,
}: GymPhoneFieldProps) {
	return (
		<FieldShell id={id} label="Telefone (opcional)" error={error}>
			<IMaskInput
				id={id}
				mask={PHONE_MASK}
				unmask
				value={value}
				onAccept={onAccept}
				onBlur={onBlur}
				inputMode="numeric"
				placeholder="(11) 90000-0000"
				data-testid={testId}
				aria-invalid={Boolean(error) || undefined}
				aria-describedby={error ? `${id}-error` : undefined}
				className={MASKED_INPUT_CLASS}
			/>
		</FieldShell>
	)
}
