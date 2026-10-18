import { describe, expect, test } from "vitest"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import { InMemoryWeatherGateway } from "./in-memory-weather-gateway.js"

describe("InMemoryWeatherGateway", () => {
	test("retorna o relatório padrão completo com sucesso", async () => {
		const gateway = new InMemoryWeatherGateway()
		const coordinate = Coordinate.restore({ latitude: 0, longitude: 0 })

		const report = (await gateway.getCurrentWeather(coordinate)).force.success()
			.value

		expect(report.temperature).toEqual({
			current: 24,
			apparent: 22,
			min: 18,
			max: 27,
		})
		expect(report.condition).toEqual({ code: 1, isDay: true })
		expect(report.humidity).toBe(64)
		expect(report.wind).toEqual({ speed: 12, directionDegrees: 45 })
		expect(report.hourly).toHaveLength(24)
		expect(report.hourly[0]).toEqual({
			time: "2026-10-18T15:00",
			temperature: 24,
			code: 1,
			isDay: true,
		})
		expect(report.hourly[23].time).toBe("2026-10-19T14:00")
		expect(report.daily).toHaveLength(7)
		expect(report.daily[6]).toEqual({
			date: "2026-10-24",
			min: 18,
			max: 27,
			code: 1,
		})
	})

	test("falha com WeatherProviderUnavailableError após simulateProviderUnavailable", async () => {
		const gateway = new InMemoryWeatherGateway()
		const coordinate = Coordinate.restore({ latitude: 0, longitude: 0 })
		gateway.simulateProviderUnavailable()

		const result = await gateway.getCurrentWeather(coordinate)

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value.name).toBe(
			"WeatherProviderUnavailableError",
		)
	})
})
