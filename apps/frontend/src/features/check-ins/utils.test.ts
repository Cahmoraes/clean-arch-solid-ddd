import { describe, expect, it } from "vitest"
import { totalCheckInPages } from "./utils.js"

describe("totalCheckInPages", () => {
	it("returns 0 when total is 0", () => {
		expect(totalCheckInPages(0, 10)).toBe(0)
	})

	it("returns 0 when total is negative", () => {
		expect(totalCheckInPages(-1, 10)).toBe(0)
	})

	it("returns 1 for total <= pageSize", () => {
		expect(totalCheckInPages(10, 10)).toBe(1)
		expect(totalCheckInPages(5, 10)).toBe(1)
		expect(totalCheckInPages(1, 10)).toBe(1)
	})

	it("returns correct pages for exact multiple", () => {
		expect(totalCheckInPages(20, 10)).toBe(2)
		expect(totalCheckInPages(30, 10)).toBe(3)
	})

	it("rounds up for partial last page", () => {
		expect(totalCheckInPages(11, 10)).toBe(2)
		expect(totalCheckInPages(21, 10)).toBe(3)
	})
})
