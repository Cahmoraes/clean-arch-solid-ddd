import { z } from "zod"

/**
 * updateProfileSchema — validates editable profile fields.
 *
 * Backend (OpenAPI) currently exposes no PATCH /users/me endpoint, so this
 * schema is kept ready for the day an edit endpoint is published. The only
 * editable field practical today is "name" (email/role are immutable per the
 * existing GET /users/me contract). Tests assert this shape so a future
 * regression in the backend contract surfaces here.
 */
export const updateProfileSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Informe seu nome (mínimo 2 caracteres).")
		.max(120, "Nome muito longo."),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
