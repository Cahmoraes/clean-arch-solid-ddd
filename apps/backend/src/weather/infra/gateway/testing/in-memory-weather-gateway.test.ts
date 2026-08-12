import { describe, expect, test } from "vitest"
import { InMemoryWeatherGateway } from "./in-memory-weather-gateway"

describe("InMemoryWeatherGateway", () => {
	test("retorna a temperatura padrão com sucesso", async () => {
		const gateway = new InMemoryWeatherGateway()

		const result = await gateway.getCurrentWeather()

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value).toEqual({
			current: 24,
			min: 18,
			max: 27,
		})
	})

	test("falha com WeatherProviderUnavailableError após simulateProviderUnavailable", async () => {
		const gateway = new InMemoryWeatherGateway()
		gateway.simulateProviderUnavailable()

		const result = await gateway.getCurrentWeather()

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe(
			"WeatherProviderUnavailableError",
		)
	})
})
