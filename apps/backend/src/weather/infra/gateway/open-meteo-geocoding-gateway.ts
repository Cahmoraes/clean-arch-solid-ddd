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
	// CircuitBreaker.wrap() binds a fixed zero-arg callback at construction
	// time, so it cannot close over a per-call `cityName` directly. Building
	// the breaker ONCE here (instance field) lets its failure count / open
	// state accumulate across every geocode() call, as a real circuit
	// breaker must. The callback reads the city from `cityNameForRequest`,
	// which geocode() updates right before each `breaker.run()`.
	private cityNameForRequest = ""
	private readonly breaker = CircuitBreaker.wrap({
		callback: () => this.fetchGeocode(this.cityNameForRequest),
		failureThresholdPercentageLimit: 50,
		resetTimeout: 30_000,
	})

	async geocode(
		cityName: string,
	): Promise<Either<CityNotFoundError, Coordinate>> {
		this.cityNameForRequest = cityName
		const retry = Retry.wrap({
			callback: () => this.breaker.run(),
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
