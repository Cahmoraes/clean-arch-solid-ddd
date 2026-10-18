import { describe, expect, test } from "vitest"
import {
	Cloud,
	CloudDrizzle,
	CloudFog,
	CloudMoon,
	CloudRain,
	CloudSun,
	CloudUnknown,
	Moon,
	Snowflake,
	Sun,
	Zap,
} from "@/components/ui/pixel-icons"
import { resolveCondition } from "./weather-condition"

describe("resolveCondition", () => {
	test.each([
		[[0, 1], "clear", "Céu limpo"],
		[[2], "partly-cloudy", "Parcialmente nublado"],
		[[3], "cloudy", "Nublado"],
		[[45, 48], "fog", "Névoa"],
		[[51, 53, 55, 56, 57], "drizzle", "Chuvisco"],
		[[61, 63, 65, 66, 67, 80, 81, 82], "rain", "Chuva"],
		[[71, 73, 75, 77, 85, 86], "snow", "Neve"],
		[[95, 96, 97, 99], "thunderstorm", "Tempestade"],
	] as const)("deve mapear os códigos %j para %s", (codes, category, label) => {
		for (const code of codes) {
			const result = resolveCondition(code, true)
			expect(result.category).toBe(category)
			expect(result.label).toBe(label)
		}
	})

	test("AC-05: deve usar sol de dia e lua à noite para os códigos 0 e 1, e chuva para o 61", () => {
		for (const code of [0, 1]) {
			expect(resolveCondition(code, true).Icon).toBe(Sun)
			expect(resolveCondition(code, false).Icon).toBe(Moon)
		}
		expect(resolveCondition(61, true).Icon).toBe(CloudRain)
		expect(resolveCondition(61, false).Icon).toBe(CloudRain)
	})

	test("deve usar o ícone da categoria nas demais condições", () => {
		expect(resolveCondition(2, true).Icon).toBe(CloudSun)
		expect(resolveCondition(2, false).Icon).toBe(CloudMoon)
		expect(resolveCondition(3, true).Icon).toBe(Cloud)
		expect(resolveCondition(45, true).Icon).toBe(CloudFog)
		expect(resolveCondition(53, true).Icon).toBe(CloudDrizzle)
		expect(resolveCondition(73, true).Icon).toBe(Snowflake)
		expect(resolveCondition(95, true).Icon).toBe(Zap)
	})

	test("deve manter o ícone da categoria à noite nas condições sem variante noturna", () => {
		expect(resolveCondition(3, false).Icon).toBe(Cloud)
		expect(resolveCondition(45, false).Icon).toBe(CloudFog)
		expect(resolveCondition(53, false).Icon).toBe(CloudDrizzle)
		expect(resolveCondition(73, false).Icon).toBe(Snowflake)
		expect(resolveCondition(95, false).Icon).toBe(Zap)
	})

	test("AC-04: deve usar o ícone genérico e nenhum rótulo de outra condição quando o código não está na tabela", () => {
		const result = resolveCondition(999, true)
		const others = [0, 2, 3, 45, 51, 61, 71, 95].map((code) =>
			resolveCondition(code, true),
		)

		expect(result.category).toBe("unknown")
		expect(result.Icon).toBe(CloudUnknown)
		expect(result.label).toBe("Condição indisponível")
		for (const other of others) {
			expect(other.Icon).not.toBe(result.Icon)
			expect(other.label).not.toBe(result.label)
		}
	})

	test("Review Focus: códigos fora da tabela não lançam e viram ícone genérico com Condição indisponível", () => {
		for (const code of [-1, 4, 44, 100, 1000]) {
			expect(() => resolveCondition(code, false)).not.toThrow()
			const result = resolveCondition(code, false)
			expect(result.Icon).toBe(CloudUnknown)
			expect(result.label).toBe("Condição indisponível")
		}
	})
})
