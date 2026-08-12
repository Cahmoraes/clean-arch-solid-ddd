import { describe, expect, test } from "vitest"
import { WeatherProviderUnavailableError } from "./weather-provider-unavailable-error"

describe("WeatherProviderUnavailableError", () => {
	test("deve expor name e message corretos", () => {
		const error = new WeatherProviderUnavailableError()

		expect(error.name).toBe("WeatherProviderUnavailableError")
		expect(error.message).toBe("Weather provider unavailable")
	})
})
