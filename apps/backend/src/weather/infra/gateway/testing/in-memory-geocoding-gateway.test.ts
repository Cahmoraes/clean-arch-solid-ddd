import { describe, expect, test } from "vitest"
import { InMemoryGeocodingGateway } from "./in-memory-geocoding-gateway"

describe("InMemoryGeocodingGateway", () => {
	test("resolve uma cidade conhecida em Coordinate", async () => {
		const gateway = new InMemoryGeocodingGateway()

		const result = await gateway.geocode("São Paulo")

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value.latitude).toBe(-23.5505)
	})

	test("falha com CityNotFoundError para uma cidade desconhecida", async () => {
		const gateway = new InMemoryGeocodingGateway()

		const result = await gateway.geocode("Atlantis")

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe("CityNotFoundError")
	})

	test("registerCity registra nova cidade e geocode retorna Coordinate com coordenadas registradas", async () => {
		const gateway = new InMemoryGeocodingGateway()

		gateway.registerCity("Rio de Janeiro", {
			latitude: -22.9068,
			longitude: -43.1729,
		})

		const result = await gateway.geocode("Rio de Janeiro")

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value.latitude).toBe(-22.9068)
		expect(result.force.success().value.longitude).toBe(-43.1729)
	})
})
