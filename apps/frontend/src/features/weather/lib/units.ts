export type UnitSystem = "metric" | "imperial"

const CARDINAL_POINTS = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"] as const

const KMH_TO_MPH = 0.621371

export function parseUnits(value: string | null): UnitSystem {
	return value === "imperial" ? "imperial" : "metric"
}

export function convertTemperature(celsius: number, units: UnitSystem): number {
	const value = units === "imperial" ? (celsius * 9) / 5 + 32 : celsius
	return Math.round(value * 10) / 10
}

export function convertWindSpeed(kmh: number, units: UnitSystem): number {
	return Math.round(units === "imperial" ? kmh * KMH_TO_MPH : kmh)
}

export function temperatureSuffix(units: UnitSystem): "°C" | "°F" {
	return units === "imperial" ? "°F" : "°C"
}

export function windSuffix(units: UnitSystem): "km/h" | "mph" {
	return units === "imperial" ? "mph" : "km/h"
}

export function windDirectionLabel(degrees: number): string {
	return CARDINAL_POINTS[Math.round(degrees / 45) % 8]
}

export function formatValue(value: number): string {
	return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
}
