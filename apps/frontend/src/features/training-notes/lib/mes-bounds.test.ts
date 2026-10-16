import { describe, expect, test } from "vitest"
import { mesBounds } from "./mes-bounds"

describe("mesBounds", () => {
	test("bounds de dezembro e janeiro cobrem o mês exato", () => {
		expect(mesBounds(2025, 12)).toEqual({
			de: "2025-12-01",
			ate: "2025-12-31",
		})
		expect(mesBounds(2026, 1)).toEqual({
			de: "2026-01-01",
			ate: "2026-01-31",
		})
	})
})
