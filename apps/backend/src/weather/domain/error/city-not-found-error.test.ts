import { describe, expect, test } from "vitest"
import { CityNotFoundError } from "./city-not-found-error"

describe("CityNotFoundError", () => {
	test("deve expor kind, name e message corretos", () => {
		const error = new CityNotFoundError("Atlantis")

		expect(error.kind).toBe("not-found")
		expect(error.name).toBe("CityNotFoundError")
		expect(error.message).toBe("City not found: Atlantis")
	})
})
