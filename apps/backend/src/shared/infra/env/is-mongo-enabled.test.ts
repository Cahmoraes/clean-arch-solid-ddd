import { afterEach, describe, expect, it, vi } from "vitest"

const MONGO_URL =
	"mongodb://localhost:27017/test?replicaSet=rs0&directConnection=true"

async function loadIsMongoEnabled(): Promise<() => boolean> {
	vi.resetModules()
	const module = await import("./index")
	return module.isMongoEnabled
}

describe("isMongoEnabled", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.resetModules()
	})

	it("FR-001: is true in production with DATABASE_PROVIDER=mongo", async () => {
		vi.stubEnv("NODE_ENV", "production")
		vi.stubEnv("DATABASE_PROVIDER", "mongo")
		vi.stubEnv("DATABASE_URL_MONGO", MONGO_URL)

		expect((await loadIsMongoEnabled())()).toBe(true)
	})

	it("FR-003: is false in production with the default provider prisma", async () => {
		vi.stubEnv("NODE_ENV", "production")
		vi.stubEnv("DATABASE_PROVIDER", "prisma")

		expect((await loadIsMongoEnabled())()).toBe(false)
	})

	it("is false outside production even with DATABASE_PROVIDER=mongo, so the in-memory adapters keep working in tests", async () => {
		vi.stubEnv("NODE_ENV", "test")
		vi.stubEnv("DATABASE_PROVIDER", "mongo")
		vi.stubEnv("DATABASE_URL_MONGO", MONGO_URL)

		expect((await loadIsMongoEnabled())()).toBe(false)
	})
})
