export const WEATHER_TYPES = {
	GATEWAYS: {
		Geocoding: Symbol.for("GeocodingGateway"),
		Weather: Symbol.for("WeatherGateway"),
	},
	USE_CASES: {
		GetCurrentWeatherByCity: Symbol.for("GetCurrentWeatherByCityUseCase"),
	},
} as const
