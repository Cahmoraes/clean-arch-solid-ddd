import { beforeEach, describe, expect, test, vi } from "vitest"
import { InMemoryGeocodingGateway } from "@/weather/infra/gateway/testing/in-memory-geocoding-gateway.js"
import { InMemoryWeatherGateway } from "@/weather/infra/gateway/testing/in-memory-weather-gateway.js"

import { GetCurrentWeatherByCityUseCase } from "./get-current-weather-by-city.usecase.js"

describe("GetCurrentWeatherByCityUseCase", () => {
	let sut: GetCurrentWeatherByCityUseCase
	let geocodingGateway: InMemoryGeocodingGateway
	let weatherGateway: InMemoryWeatherGateway

	beforeEach(() => {
		geocodingGateway = new InMemoryGeocodingGateway()
		weatherGateway = new InMemoryWeatherGateway()
		sut = new GetCurrentWeatherByCityUseCase(geocodingGateway, weatherGateway)
	})

	test("cidade conhecida + provider ok retorna CurrentWeather completo", async () => {
		const result = await sut.execute({ city: "São Paulo" })

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value).toEqual({
			city: "São Paulo",
			temperature: { current: 24, min: 18, max: 27 },
		})
	})

	test("cidade desconhecida falha com CityNotFoundError sem chamar weatherGateway", async () => {
		const getCurrentWeatherSpy = vi.spyOn(weatherGateway, "getCurrentWeather")

		const result = await sut.execute({ city: "Atlantis" })

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe("CityNotFoundError")
		expect(getCurrentWeatherSpy).not.toHaveBeenCalled()
	})

	test("cidade conhecida com provider indisponível falha com WeatherProviderUnavailableError", async () => {
		weatherGateway.simulateProviderUnavailable()

		const result = await sut.execute({ city: "São Paulo" })

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe(
			"WeatherProviderUnavailableError",
		)
	})
})
