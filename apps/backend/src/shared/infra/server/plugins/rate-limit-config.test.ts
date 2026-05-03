import { describe, expect, test } from "vitest"
import { RATE_LIMIT_CONFIG } from "./rate-limit-config.js"

describe("RateLimitConfig", () => {
	test("auth limits are correct for MEMBER", () => {
		expect(RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER).toBe(20)
	})

	test("auth limits are correct for ADMIN", () => {
		expect(RATE_LIMIT_CONFIG.AUTH.MAX_ADMIN).toBe(60)
	})

	test("general limits are correct for MEMBER", () => {
		expect(RATE_LIMIT_CONFIG.GENERAL.MAX_MEMBER).toBe(100)
	})

	test("general limits are correct for ADMIN", () => {
		expect(RATE_LIMIT_CONFIG.GENERAL.MAX_ADMIN).toBe(300)
	})

	test("time window is 15 minutes in milliseconds", () => {
		const fifteenMinutesMs = 15 * 60 * 1000
		expect(RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW).toBe(fifteenMinutesMs)
		expect(RATE_LIMIT_CONFIG.GENERAL.TIME_WINDOW).toBe(fifteenMinutesMs)
	})

	test("admin multiplier is 3x", () => {
		expect(RATE_LIMIT_CONFIG.ADMIN_MULTIPLIER).toBe(3)
	})

	test("admin limits equal member limits times multiplier", () => {
		expect(RATE_LIMIT_CONFIG.AUTH.MAX_ADMIN).toBe(
			RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER * RATE_LIMIT_CONFIG.ADMIN_MULTIPLIER,
		)
		expect(RATE_LIMIT_CONFIG.GENERAL.MAX_ADMIN).toBe(
			RATE_LIMIT_CONFIG.GENERAL.MAX_MEMBER * RATE_LIMIT_CONFIG.ADMIN_MULTIPLIER,
		)
	})

	test("Redis namespace is rl:", () => {
		expect(RATE_LIMIT_CONFIG.REDIS_NAMESPACE).toBe("rl:")
	})
})
