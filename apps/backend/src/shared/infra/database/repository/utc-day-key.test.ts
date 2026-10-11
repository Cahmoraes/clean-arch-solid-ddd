import { describe, expect, it } from "vitest"
import { utcDayKey } from "./utc-day-key"

describe("utcDayKey", () => {
	it("returns the UTC calendar day regardless of the process time zone", () => {
		expect(utcDayKey(new Date("2026-05-10T23:59:59.999Z"))).toBe("2026-05-10")
		expect(utcDayKey(new Date("2026-05-11T00:00:00.000Z"))).toBe("2026-05-11")
	})
})
