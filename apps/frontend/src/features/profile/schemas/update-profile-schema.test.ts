import { describe, expect, it } from "vitest"
import { updateProfileSchema } from "./update-profile-schema"

describe("updateProfileSchema", () => {
	it("aceita um nome válido", () => {
		const parsed = updateProfileSchema.parse({ name: "Alice" })
		expect(parsed.name).toBe("Alice")
	})

	it("faz trim no nome", () => {
		const parsed = updateProfileSchema.parse({ name: "  Alice  " })
		expect(parsed.name).toBe("Alice")
	})

	it("rejeita nome muito curto", () => {
		const result = updateProfileSchema.safeParse({ name: "A" })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toMatch(/mínimo 2/i)
		}
	})

	it("rejeita nome muito longo", () => {
		const result = updateProfileSchema.safeParse({ name: "x".repeat(121) })
		expect(result.success).toBe(false)
	})
})
