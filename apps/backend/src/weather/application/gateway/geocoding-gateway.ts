import type { Coordinate } from "@/shared/domain/value-object/coordinate"
import type { Either } from "@/shared/domain/value-object/either"
import type { CityNotFoundError } from "@/weather/domain/error/city-not-found-error"

export interface GeocodingGateway {
	geocode(cityName: string): Promise<Either<CityNotFoundError, Coordinate>>
}
