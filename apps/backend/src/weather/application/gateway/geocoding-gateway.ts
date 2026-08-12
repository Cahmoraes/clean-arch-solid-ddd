import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import type { Either } from "@/shared/domain/value-object/either.js"
import type { CityNotFoundError } from "@/weather/domain/error/city-not-found-error.js"

export interface GeocodingGateway {
	geocode(cityName: string): Promise<Either<CityNotFoundError, Coordinate>>
}
