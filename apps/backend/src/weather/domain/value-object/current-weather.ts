import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"

export interface WeatherCondition {
	code: number
	isDay: boolean
}

export interface HourlyForecast {
	time: string
	temperature: number
	code: number
	isDay: boolean
}

export interface DailyForecast {
	date: string
	min: number
	max: number
	code: number
}

export interface WindReading {
	speed: number
	directionDegrees: number
}

export interface Temperature {
	current: number
	apparent: number
	min: number
	max: number
}

export interface WeatherReport {
	temperature: Temperature
	condition: WeatherCondition
	humidity: number
	wind: WindReading
	hourly: HourlyForecast[]
	daily: DailyForecast[]
}

export interface CurrentWeather extends WeatherReport {
	city: string
	coordinate: Coordinate
}
