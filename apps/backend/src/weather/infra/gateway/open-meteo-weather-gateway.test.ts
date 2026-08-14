import { afterEach, describe, expect, test, vi } from "vitest"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import { OpenMeteoWeatherGateway } from "./open-meteo-weather-gateway.js"

describe("OpenMeteoWeatherGateway", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	test("resolve Temperature quando a API responde com sucesso", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					current: { temperature_2m: 24 },
					daily: {
						temperature_2m_max: [27],
						temperature_2m_min: [18],
					},
				}),
			})),
		)
		const gateway = new OpenMeteoWeatherGateway()
		const coordinate = Coordinate.create({
			latitude: -23.5505,
			longitude: -46.6333,
		}).force.success().value

		const result = await gateway.getCurrentWeather(coordinate)

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value).toEqual({
			current: 24,
			min: 18,
			max: 27,
		})
	})

	test("falha com WeatherProviderUnavailableError quando a API responde com erro", async () => {
		vi.useFakeTimers()
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: false,
				status: 500,
				json: async () => ({}),
			})),
		)
		const gateway = new OpenMeteoWeatherGateway()
		const coordinate = Coordinate.create({
			latitude: -23.5505,
			longitude: -46.6333,
		}).force.success().value

		const resultPromise = gateway.getCurrentWeather(coordinate)
		await vi.advanceTimersByTimeAsync(2000)
		const result = await resultPromise

		// A CircuitBreaker eh compartilhada entre as 3 tentativas do Retry.
		// Apos a 1a falha, failureThreshold (1/1 = 100% > 50%) abre o circuito
		// imediatamente, entao as tentativas 2 e 3 sao bloqueadas por
		// OpenCircleError sem nunca chegar a fetchForecast/fetch de novo.
		expect(fetch).toHaveBeenCalledTimes(1)
		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe(
			"WeatherProviderUnavailableError",
		)
	})
})
