import { describe, expect, it } from "vitest"
import {
	activateSchema,
	changePasswordSchema,
	loginSchema,
	signupSchema,
} from "./index"

describe("loginSchema", () => {
	it("aceita email e senha válidos", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "secret123",
		})
		expect(result.success).toBe(true)
	})

	it("rejeita email inválido", () => {
		const result = loginSchema.safeParse({
			email: "not-an-email",
			password: "secret123",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			const emailError = result.error.issues.find((i) =>
				i.path.includes("email"),
			)
			expect(emailError?.message).toMatch(/e-mail/i)
		}
	})

	it("rejeita senha abaixo do mínimo", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "123",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			const passwordError = result.error.issues.find((i) =>
				i.path.includes("password"),
			)
			expect(passwordError?.message).toMatch(/senha/i)
		}
	})
})

describe("signupSchema", () => {
	it("aceita nome, email e senha válidos", () => {
		const result = signupSchema.safeParse({
			name: "John Doe",
			email: "john@example.com",
			password: "secret123",
		})
		expect(result.success).toBe(true)
	})

	it("rejeita nome muito curto", () => {
		const result = signupSchema.safeParse({
			name: "J",
			email: "john@example.com",
			password: "secret123",
		})
		expect(result.success).toBe(false)
	})

	it("rejeita senha curta", () => {
		const result = signupSchema.safeParse({
			name: "John Doe",
			email: "john@example.com",
			password: "12345",
		})
		expect(result.success).toBe(false)
	})

	it("rejeita email inválido", () => {
		const result = signupSchema.safeParse({
			name: "John Doe",
			email: "invalid",
			password: "secret123",
		})
		expect(result.success).toBe(false)
	})
})

describe("activateSchema", () => {
	it("aceita uuid válido", () => {
		const result = activateSchema.safeParse({
			userId: "550e8400-e29b-41d4-a716-446655440000",
		})
		expect(result.success).toBe(true)
	})

	it("rejeita token não-uuid", () => {
		const result = activateSchema.safeParse({ userId: "not-a-uuid" })
		expect(result.success).toBe(false)
	})
})

describe("changePasswordSchema", () => {
	const valid = {
		currentPassword: "oldpass1",
		newPassword: "newpass1",
		confirmPassword: "newpass1",
	}

	it("aceita campos válidos e correspondentes", () => {
		expect(changePasswordSchema.safeParse(valid).success).toBe(true)
	})

	it("rejeita confirmação divergente", () => {
		const result = changePasswordSchema.safeParse({
			...valid,
			confirmPassword: "different1",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			const confirmError = result.error.issues.find((i) =>
				i.path.includes("confirmPassword"),
			)
			expect(confirmError?.message).toMatch(/corresponde/i)
		}
	})

	it("rejeita nova senha igual à atual", () => {
		const result = changePasswordSchema.safeParse({
			currentPassword: "samepass",
			newPassword: "samepass",
			confirmPassword: "samepass",
		})
		expect(result.success).toBe(false)
	})

	it("rejeita nova senha curta", () => {
		const result = changePasswordSchema.safeParse({
			currentPassword: "oldpass1",
			newPassword: "123",
			confirmPassword: "123",
		})
		expect(result.success).toBe(false)
	})

	it("rejeita senha atual vazia", () => {
		const result = changePasswordSchema.safeParse({
			currentPassword: "",
			newPassword: "newpass1",
			confirmPassword: "newpass1",
		})
		expect(result.success).toBe(false)
	})
})
