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

	test("AC-01: Deve retornar o clima atual com condição, sensação, umidade, vento, 24 horas e 7 dias", async () => {
		const response = await request(fastifyServer.server).get(
			"/weather?city=S%C3%A3o%20Paulo",
		)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toMatchObject({
			city: "São Paulo",
			latitude: -23.5505,
			longitude: -46.6333,
			temperature: { current: 24, apparent: 22, min: 18, max: 27 },
			condition: { code: 1, isDay: true },
			humidity: 64,
			wind: { speed: 12, directionDegrees: 45 },
		})
		expect(response.body.hourly).toHaveLength(24)
		expect(response.body.hourly[0]).toEqual({
			time: "2026-10-18T15:00",
			temperature: 24,
			code: 1,
			isDay: true,
		})
		expect(response.body.hourly[23].time).toBe("2026-10-19T14:00")
		expect(response.body.daily).toHaveLength(7)
		expect(response.body.daily[0]).toEqual({
			date: "2026-10-18",
			min: 18,
			max: 27,
			code: 1,
		})
		expect(response.body.daily[6].date).toBe("2026-10-24")
	})

	test("AC-08: Deve retornar 404 para uma cidade desconhecida", async () => {
		const response = await request(fastifyServer.server).get(
			"/weather?city=Atlantis",
		)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toEqual({
			code: "city_not_found",
			message: "City not found",
		})
	})

	test("AC-07: Deve retornar 503 quando o provider de clima está indisponível", async () => {
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
