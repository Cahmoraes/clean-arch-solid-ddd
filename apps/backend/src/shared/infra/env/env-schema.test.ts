import { describe, expect, it } from "vitest"
import { envSchema } from "./env-schema"

const baseEnv = {
	PORT: "3333",
	PRIVATE_KEY: "a".repeat(32),
	DATABASE_URL: "postgresql://docker:docker@localhost:5432/apisolid",
	STRIPE_PUBLIC_KEY: "pk_test",
	STRIPE_PRIVATE_KEY: "sk_test",
	STRIPE_PRICE_ID: "price_test",
	STRIPE_WEBHOOK_SECRET: "whsec_test",
}

const mongoUrl =
	"mongodb://localhost:27017/test?replicaSet=rs0&directConnection=true"

function issuePaths(result: ReturnType<typeof envSchema.safeParse>): string[] {
	if (result.success) return []
	return result.error.issues.map((issue) => issue.path.join("."))
}

describe("envSchema DATABASE_PROVIDER", () => {
	it("FR-003: defaults DATABASE_PROVIDER to prisma when it is absent", () => {
		const result = envSchema.safeParse(baseEnv)
		expect(result.success).toBe(true)
		expect(result.data?.DATABASE_PROVIDER).toBe("prisma")
	})

	it("FR-001: accepts prisma without DATABASE_URL_MONGO", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			DATABASE_PROVIDER: "prisma",
		})
		expect(result.success).toBe(true)
		expect(result.data?.DATABASE_URL_MONGO).toBeUndefined()
	})

	it("FR-001: accepts mongo when DATABASE_URL_MONGO is set", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			DATABASE_PROVIDER: "mongo",
			DATABASE_URL_MONGO: mongoUrl,
		})
		expect(result.success).toBe(true)
		expect(result.data?.DATABASE_PROVIDER).toBe("mongo")
		expect(result.data?.DATABASE_URL_MONGO).toBe(mongoUrl)
	})

	it("AC-04: rejects an invalid DATABASE_PROVIDER value", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			DATABASE_PROVIDER: "mysql",
		})
		expect(result.success).toBe(false)
		expect(issuePaths(result)).toContain("DATABASE_PROVIDER")
	})

	it("AC-04: rejects provider mongo without DATABASE_URL_MONGO", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			DATABASE_PROVIDER: "mongo",
		})
		expect(result.success).toBe(false)
		expect(issuePaths(result)).toContain("DATABASE_URL_MONGO")
	})
})
