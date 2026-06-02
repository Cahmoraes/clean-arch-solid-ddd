import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { InvalidDistanceError } from "../error/invalid-distance-error"

export interface CoordinateDTO {
	latitude: number
	longitude: number
}

export class Distance {
	private readonly _from: Coordinate
	private readonly _to: Coordinate

	private constructor(from: Coordinate, to: Coordinate) {
		this._from = from
		this._to = to
	}

	public static create(
		from: CoordinateDTO,
		to: CoordinateDTO,
	): Either<InvalidDistanceError, Distance>
	public static create(
		from: Coordinate,
		to: Coordinate,
	): Either<InvalidDistanceError, Distance> {
		if (from instanceof Coordinate && to instanceof Coordinate) {
			return success(new Distance(from, to))
		}
		const fromCoordOrError = Coordinate.create(from)
		if (fromCoordOrError.isFailure()) {
			return failure(new InvalidDistanceError(fromCoordOrError.value.message))
		}
		const toCoordOrError = Coordinate.create(to)
		if (toCoordOrError.isFailure()) {
			return failure(new InvalidDistanceError(toCoordOrError.value.message))
		}
		const distance = new Distance(fromCoordOrError.value, toCoordOrError.value)
		return success(distance)
	}

	get from(): Coordinate {
		return this._from
	}

	get to(): Coordinate {
		return this._to
	}

	get value(): number {
		return this._from.distanceTo(this._to)
	}
}
