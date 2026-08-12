import { WEATHER_TYPES } from "@/shared/infra/ioc/module/service-identifier/weather-types.js"
import { type ModuleControllers, resolve } from "./server-build.js"

export function setupWeatherModule(): ModuleControllers {
	const controllers = [resolve(WEATHER_TYPES.CONTROLLERS.Weather)]
	return { controllers }
}
