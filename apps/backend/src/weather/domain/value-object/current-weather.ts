export interface Temperature {
	current: number
	min: number
	max: number
}

export interface CurrentWeather {
	city: string
	temperature: Temperature
}
