import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { ZodError, z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { WEATHER_TYPES } from "@/shared/infra/ioc/module/service-identifier/weather-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import type { GetCurrentWeatherByCityUseCase } from "@/weather/application/use-case/get-current-weather-by-city.usecase.js"
import { WeatherRoutes } from "./routes/weather-routes.js"

const weatherQuerySchema = z.object({
	city: z.string().min(1).max(100).meta({
		description: "City name",
		example: "São Paulo",
	}),
})

const weatherResponseSchema = z.object({
	city: z.string().meta({ description: "City name" }),
	temperature: z
		.object({
			current: z.number().meta({ description: "Current temperature (°C)" }),
			apparent: z
				.number()
				.meta({ description: "Apparent (feels-like) temperature (°C)" }),
			min: z.number().meta({ description: "Minimum temperature (°C)" }),
			max: z.number().meta({ description: "Maximum temperature (°C)" }),
		})
		.meta({ description: "Temperature readings" }),
	condition: z
		.object({
			code: z.number().int().meta({ description: "WMO weather code" }),
			isDay: z.boolean().meta({ description: "Whether it is daytime" }),
		})
		.meta({ description: "Current weather condition" }),
	humidity: z.number().meta({ description: "Relative humidity (0-100%)" }),
	wind: z
		.object({
			speed: z.number().meta({ description: "Wind speed (km/h)" }),
			directionDegrees: z
				.number()
				.meta({ description: "Wind direction in degrees (0-360)" }),
		})
		.meta({ description: "Current wind" }),
	hourly: z
		.array(
			z.object({
				time: z.string().meta({
					description: "Local city time without offset",
					example: "2026-10-18T15:00",
				}),
				temperature: z.number().meta({ description: "Temperature (°C)" }),
				code: z.number().int().meta({ description: "WMO weather code" }),
				isDay: z.boolean().meta({ description: "Whether it is daytime" }),
			}),
		)
		.meta({ description: "Next 24 hours, starting at the current local hour" }),
	daily: z
		.array(
			z.object({
				date: z.string().meta({
					description: "Local calendar day",
					example: "2026-10-18",
				}),
				min: z.number().meta({ description: "Minimum temperature (°C)" }),
				max: z.number().meta({ description: "Maximum temperature (°C)" }),
				code: z.number().int().meta({ description: "WMO weather code" }),
			}),
		)
		.meta({ description: "Next 7 days" }),
	latitude: z.number().meta({ description: "Latitude of the resolved city" }),
	longitude: z.number().meta({ description: "Longitude of the resolved city" }),
})

const errorResponseSchema = z.object({
	code: z.string().optional().meta({ description: "Error code" }),
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class WeatherController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(WEATHER_TYPES.USE_CASES.GetCurrentWeatherByCity)
		private readonly getCurrentWeatherByCity: GetCurrentWeatherByCityUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.httpServer.register(
			"get",
			WeatherRoutes.GET,
			{ callback: this.callback },
			makeWeatherSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		if (error.name === "CityNotFoundError") {
			return ResponseFactory.NOT_FOUND({
				code: "city_not_found",
				message: "City not found",
			})
		}

		if (error.name === "WeatherProviderUnavailableError") {
			return ResponseFactory.create({
				status: HTTP_STATUS.SERVICE_UNAVAILABLE,
				code: "weather_provider_unavailable",
				message: "Weather provider unavailable",
			})
		}

		return undefined
	}

	private async callback(req: FastifyRequest) {
		const parsedQueryOrError = this.parseRequest(weatherQuerySchema, req.query)
		if (parsedQueryOrError.isFailure()) {
			return this.createResponseError(parsedQueryOrError)
		}

		const result = await this.getCurrentWeatherByCity.execute({
			city: parsedQueryOrError.value.city,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		const currentWeather = result.value
		return ResponseFactory.OK({
			body: {
				city: currentWeather.city,
				temperature: currentWeather.temperature,
				condition: currentWeather.condition,
				humidity: currentWeather.humidity,
				wind: currentWeather.wind,
				hourly: currentWeather.hourly,
				daily: currentWeather.daily,
				latitude: currentWeather.coordinate.latitude,
				longitude: currentWeather.coordinate.longitude,
			},
		})
	}
}

function makeWeatherSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["weather"],
		summary: "Get current weather by city name",
		description:
			"Public endpoint: resolves a city name to coordinates and returns the current temperature plus the day's min/max.",
		querystring: weatherQuerySchema,
		responses: {
			200: {
				description: "Current weather retrieved successfully",
				schema: weatherResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			404: { description: "City not found", schema: errorResponseSchema },
			503: {
				description: "Weather provider unavailable",
				schema: errorResponseSchema,
			},
		},
	})
}
