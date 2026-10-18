import { describe, expect, test } from "vitest"
import {
	convertTemperature,
	convertWindSpeed,
	formatValue,
	parseUnits,
	temperatureSuffix,
	windDirectionLabel,
	windSuffix,
} from "./units"

describe("units", () => {
	test("AC-03: deve converter 22,4 °C para 72,3 °F e 12 km/h para 7 mph no sistema imperial", () => {
		expect(convertTemperature(22.4, "imperial")).toBe(72.3)
		expect(convertWindSpeed(12, "imperial")).toBe(7)
		expect(temperatureSuffix("imperial")).toBe("°F")
		expect(windSuffix("imperial")).toBe("mph")
	})

	test("AC-09: deve tratar units inválido ou ausente como métrico (°C, km/h)", () => {
		for (const value of [null, "", "banana", "IMPERIAL"]) {
			expect(parseUnits(value)).toBe("metric")
		}
		expect(parseUnits("imperial")).toBe("imperial")
		expect(convertTemperature(22.4, "metric")).toBe(22.4)
		expect(convertWindSpeed(12, "metric")).toBe(12)
		expect(temperatureSuffix("metric")).toBe("°C")
		expect(windSuffix("metric")).toBe("km/h")
	})

	test("deve formatar números em pt-BR com até 1 casa decimal", () => {
		expect(formatValue(22.4)).toBe("22,4")
		expect(formatValue(24)).toBe("24")
	})

	test("deve mapear graus para os 8 pontos cardeais em português", () => {
		const cases: Array<[number, string]> = [
			[45, "NE"],
			[90, "L"],
			[135, "SE"],
			[180, "S"],
			[225, "SO"],
			[270, "O"],
			[315, "NO"],
			[22, "N"],
			[23, "NE"],
		]
		for (const [degrees, label] of cases) expect(windDirectionLabel(degrees)).toBe(label)
	})

	test("Review Focus: direção do vento 0, 359 e 360 graus viram N", () => {
		expect(windDirectionLabel(0)).toBe("N")
		expect(windDirectionLabel(359)).toBe("N")
		expect(windDirectionLabel(360)).toBe("N")
	})
})
