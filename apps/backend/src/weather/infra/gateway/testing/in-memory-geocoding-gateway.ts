import { injectable } from "inversify"
import { Coordinate } from "@/shared/domain/value-object/coordinate"
import { type Either, failure, success } from "@/shared/domain/value-object/either"
import type { GeocodingGateway } from "@/weather/application/gateway/geocoding-gateway"
import { CityNotFoundError } from "@/weather/domain/error/city-not-found-error"

@injectable()
export class InMemoryGeocodingGateway implements GeocodingGateway {
	private readonly knownCities = new Map<
		string,
		{ latitude: number; longitude: number }
	>([["São Paulo", { latitude: -23.5505, longitude: -46.6333 }]])

	async geocode(
		cityName: string,
	): Promise<Either<CityNotFoundError, Coordinate>> {
		const coords = this.knownCities.get(cityName)
		if (!coords) {
			return failure(new CityNotFoundError(cityName))
		}
		const coordinateOrError = Coordinate.create(coords)
		if (coordinateOrError.isFailure()) {
			return failure(new CityNotFoundError(cityName))
		}
		return success(coordinateOrError.value)
	}

	registerCity(
		cityName: string,
		coords: { latitude: number; longitude: number },
	): void {
		this.knownCities.set(cityName, coords)
	}
}
