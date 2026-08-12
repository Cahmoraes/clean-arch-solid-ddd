import { afterEach, describe, expect, test, vi } from "vitest"
import { OpenMeteoGeocodingGateway } from "./open-meteo-geocoding-gateway.js"

describe("OpenMeteoGeocodingGateway", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	test("resolve Coordinate quando a API retorna resultados", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
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
				json: async () => ({ results: [] }),
			})),
		)
		const gateway = new OpenMeteoGeocodingGateway()

		const result = await gateway.geocode("Atlantis")

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe("CityNotFoundError")
	})
})
