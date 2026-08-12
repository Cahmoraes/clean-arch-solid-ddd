import { ContainerModule } from "inversify"
import { GetCurrentWeatherByCityUseCase } from "@/weather/application/use-case/get-current-weather-by-city.usecase.js"
import { WeatherController } from "@/weather/infra/controller/weather-controller.js"
import { OpenMeteoGeocodingGateway } from "@/weather/infra/gateway/open-meteo-geocoding-gateway.js"
import { OpenMeteoWeatherGateway } from "@/weather/infra/gateway/open-meteo-weather-gateway.js"
import { WEATHER_TYPES } from "../service-identifier/weather-types.js"

export const weatherModule = new ContainerModule(({ bind }): void => {
	bind(WEATHER_TYPES.GATEWAYS.Geocoding)
		.to(OpenMeteoGeocodingGateway)
		.inSingletonScope()
	bind(WEATHER_TYPES.GATEWAYS.Weather)
		.to(OpenMeteoWeatherGateway)
		.inSingletonScope()
	bind(WEATHER_TYPES.USE_CASES.GetCurrentWeatherByCity).to(
		GetCurrentWeatherByCityUseCase,
	)
	bind(WEATHER_TYPES.CONTROLLERS.Weather).to(WeatherController)
})
