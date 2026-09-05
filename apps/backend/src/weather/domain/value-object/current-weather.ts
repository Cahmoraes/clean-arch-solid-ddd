import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"

export interface Temperature {
	current: number
	min: number
	max: number
}

export interface CurrentWeather {
	city: string
	temperature: Temperature
	coordinate: Coordinate
}
