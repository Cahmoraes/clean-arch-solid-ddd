import { afterEach, describe, expect, test, vi } from "vitest"
import { OpenMeteoGeocodingGateway } from "./open-meteo-geocoding-gateway.js"

describe("OpenMeteoGeocodingGateway", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	test("resolve Coordinate quando a API retorna resultados", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					results: [{ latitude: -23.5505, longitude: -46.6333 }],
				}),
			})),
		)
		const gateway = new OpenMeteoGeocodingGateway()

		const result = await gateway.geocode("São Paulo")

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value.latitude).toBe(-23.5505)
		expect(result.force.success().value.longitude).toBe(-46.6333)
	})

	test("falha com CityNotFoundError quando a API não retorna resultados", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ results: [] }),
			})),
		)
		const gateway = new OpenMeteoGeocodingGateway()

		const result = await gateway.geocode("Atlantis")

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe("CityNotFoundError")
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
		const gateway = new OpenMeteoGeocodingGateway()

		const resultPromise = gateway.geocode("São Paulo")
		await vi.advanceTimersByTimeAsync(2000)
		const result = await resultPromise

		expect(fetch).toHaveBeenCalledTimes(1)
		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe(
			"WeatherProviderUnavailableError",
		)
	})
})
