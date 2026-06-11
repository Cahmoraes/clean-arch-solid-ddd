import { z } from "zod"

/**
 * updateProfileSchema — validates editable profile fields.
 *
 * Rules mirror the backend domain Name VO: min(5).max(30).
 */
export const updateProfileSchema = z.object({
	name: z
		.string()
		.trim()
		.min(5, "Informe seu nome (mínimo 5 caracteres).")
		.max(30, "Nome muito longo (máximo 30 caracteres)."),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
