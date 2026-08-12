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
})
