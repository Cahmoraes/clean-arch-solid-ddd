import { z } from "zod"

export const loginRequestSchema = z.object({
	email: z.email(),
	password: z.string().min(6),
})

export const loginResponseSchema = z.object({
	token: z.string(),
	refreshToken: z.string().optional(),
})

export const refreshResponseSchema = z
	.object({
		token: z.string().optional(),
		accessToken: z.string().optional(),
		message: z.string().optional(),
	})
	.refine(
		(value) => Boolean(value.token ?? value.accessToken ?? value.message),
		{
			message: "refresh response missing token",
		},
	)

export const sessionUserSchema = z.object({
	id: z.string(),
	role: z.enum(["MEMBER", "ADMIN"]),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type RefreshResponse = z.infer<typeof refreshResponseSchema>
export type SessionUser = z.infer<typeof sessionUserSchema>
