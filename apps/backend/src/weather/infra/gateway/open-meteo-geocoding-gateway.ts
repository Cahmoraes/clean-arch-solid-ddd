import { injectable } from "inversify"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { CircuitBreaker } from "@/shared/infra/gateway/circuit-breaker.js"
import { Retry } from "@/shared/infra/gateway/retry.js"
import type { GeocodingGateway } from "@/weather/application/gateway/geocoding-gateway.js"
import { CityNotFoundError } from "@/weather/domain/error/city-not-found-error.js"

interface OpenMeteoGeocodingResponse {
	results?: Array<{ latitude: number; longitude: number }>
}

@injectable()
export class OpenMeteoGeocodingGateway implements GeocodingGateway {
	private readonly baseUrl = "https://geocoding-api.open-meteo.com/v1/search"

	async geocode(
		cityName: string,
	): Promise<Either<CityNotFoundError, Coordinate>> {
		const breaker = CircuitBreaker.wrap({
			callback: () => this.fetchGeocode(cityName),
			failureThresholdPercentageLimit: 50,
			resetTimeout: 30_000,
		})
		const retry = Retry.wrap({
			callback: () => breaker.run(),
			maxAttempts: 3,
			time: 500,
		})
		const data = (await retry.run()) as OpenMeteoGeocodingResponse
		const first = data.results?.[0]
		if (!first) {
			return failure(new CityNotFoundError(cityName))
		}
		const coordinateOrError = Coordinate.create({
			latitude: first.latitude,
			longitude: first.longitude,
		})
		if (coordinateOrError.isFailure()) {
			return failure(new CityNotFoundError(cityName))
		}
		return success(coordinateOrError.value)
	}

	private async fetchGeocode(
		cityName: string,
	): Promise<OpenMeteoGeocodingResponse> {
		const url = `${this.baseUrl}?name=${encodeURIComponent(cityName)}&count=1`
		const response = await fetch(url)
		return response.json() as Promise<OpenMeteoGeocodingResponse>
	}
}
