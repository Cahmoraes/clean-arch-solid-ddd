import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { container } from "@/shared/infra/ioc/container"
import { WEATHER_TYPES } from "@/shared/infra/ioc/module/service-identifier/weather-types.js"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { InMemoryGeocodingGateway } from "@/weather/infra/gateway/testing/in-memory-geocoding-gateway.js"
import { InMemoryWeatherGateway } from "@/weather/infra/gateway/testing/in-memory-weather-gateway.js"

describe("Consultar clima atual por cidade", () => {
	let fastifyServer: FastifyAdapter
	let geocodingGateway: InMemoryGeocodingGateway
	let weatherGateway: InMemoryWeatherGateway

	beforeEach(async () => {
		container.snapshot()
		geocodingGateway = new InMemoryGeocodingGateway()
		weatherGateway = new InMemoryWeatherGateway()
		container
			.rebind(WEATHER_TYPES.GATEWAYS.Geocoding)
			.toConstantValue(geocodingGateway)
		container
			.rebind(WEATHER_TYPES.GATEWAYS.Weather)
			.toConstantValue(weatherGateway)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve retornar o clima atual para uma cidade conhecida", async () => {
		const response = await request(fastifyServer.server).get(
			"/weather?city=S%C3%A3o%20Paulo",
		)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			city: "São Paulo",
			temperature: { current: 24, min: 18, max: 27 },
		})
	})

	test("Deve retornar 404 para uma cidade desconhecida", async () => {
		const response = await request(fastifyServer.server).get(
			"/weather?city=Atlantis",
		)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toEqual({
			code: "city_not_found",
			message: "City not found",
		})
	})

	test("Deve retornar 503 quando o provider de clima está indisponível", async () => {
		weatherGateway.simulateProviderUnavailable()

		const response = await request(fastifyServer.server).get(
			"/weather?city=S%C3%A3o%20Paulo",
		)

		expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE)
		expect(response.body).toEqual({
			code: "weather_provider_unavailable",
			message: "Weather provider unavailable",
		})
	})

	test("Deve retornar 503 quando o provider de geocoding está indisponível", async () => {
		geocodingGateway.simulateProviderUnavailable()

		const response = await request(fastifyServer.server).get(
			"/weather?city=S%C3%A3o%20Paulo",
		)

		expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE)
		expect(response.body).toEqual({
			code: "weather_provider_unavailable",
			message: "Weather provider unavailable",
		})
	})

	test("Deve retornar 400 quando city não é informado", async () => {
		const response = await request(fastifyServer.server).get("/weather")

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})
})
