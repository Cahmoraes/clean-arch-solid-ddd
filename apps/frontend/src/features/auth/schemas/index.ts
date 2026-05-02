import { z } from "zod"

const PASSWORD_MIN_LENGTH = 6

const passwordSchema = z
	.string()
	.min(
		PASSWORD_MIN_LENGTH,
		`A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
	)

export const loginSchema = z.object({
	email: z.email("Informe um e-mail válido."),
	password: z
		.string()
		.min(1, "Informe sua senha.")
		.min(
			PASSWORD_MIN_LENGTH,
			`A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
		),
})

export const signupSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Informe seu nome (mínimo 2 caracteres).")
		.max(120, "Nome muito longo."),
	email: z.email("Informe um e-mail válido."),
	password: passwordSchema,
})

export const activateSchema = z.object({
	userId: z.uuid("Token de ativação inválido."),
})

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Informe sua senha atual."),
		newPassword: passwordSchema,
		confirmPassword: z.string().min(1, "Confirme sua nova senha."),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		path: ["confirmPassword"],
		message: "A confirmação não corresponde à nova senha.",
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		path: ["newPassword"],
		message: "A nova senha deve ser diferente da atual.",
	})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ActivateInput = z.infer<typeof activateSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
