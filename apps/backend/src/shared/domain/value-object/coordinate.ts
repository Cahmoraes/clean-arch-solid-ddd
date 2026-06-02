import { InvalidLatitudeError } from "../error/invalid-latitude-error.js"
import { InvalidLongitudeError } from "../error/invalid-longitude-error.js"
import { type Either, failure, success } from "./either.js"

export interface CoordinateCreate {
	latitude: number
	longitude: number
}

const MAX_LATITUDE = 90
const MIN_LATITUDE = -90
const MAX_LONGITUDE = 180
const MIN_LONGITUDE = -180

export class Coordinate {
	private _latitude: number
	private _longitude: number

	private constructor(props: CoordinateCreate) {
		this._latitude = props.latitude
		this._longitude = props.longitude
	}

	public static create(
		props: CoordinateCreate,
	): Either<InvalidLatitudeError | InvalidLongitudeError, Coordinate> {
		const coordsOrError = Coordinate.validate(props)
		if (coordsOrError.isFailure()) return failure(coordsOrError.value)
		const coordinate = new Coordinate(coordsOrError.value)
		return success(coordinate)
	}

	public static validate(
		props: CoordinateCreate,
	): Either<Error, CoordinateCreate> {
		if (props.latitude < MIN_LATITUDE || props.latitude > MAX_LATITUDE) {
			return failure(new InvalidLatitudeError())
		}
		if (props.longitude < MIN_LONGITUDE || props.longitude > MAX_LONGITUDE) {
			return failure(new InvalidLongitudeError())
		}
		return success(props)
	}

	public static restore(props: CoordinateCreate) {
		return new Coordinate(props)
	}

	get latitude(): number {
		return this._latitude
	}

	get longitude(): number {
		return this._longitude
	}

	public distanceTo(other: Coordinate): number {
		if (
			this._latitude === other.latitude &&
			this._longitude === other.longitude
		) {
			return 0
		}
		const fromRadian = (Math.PI * this._latitude) / 180
		const toRadian = (Math.PI * other.latitude) / 180
		const theta = this._longitude - other.longitude
		const radTheta = (Math.PI * theta) / 180
		let dist =
			Math.sin(fromRadian) * Math.sin(toRadian) +
			Math.cos(fromRadian) * Math.cos(toRadian) * Math.cos(radTheta)
		if (dist > 1) {
			dist = 1
		} else if (dist < -1) {
			dist = -1
		}
		dist = Math.acos(dist)
		dist = (dist * 180) / Math.PI
		dist = dist * 60 * 1.1515
		dist = dist * 1.609344
		return dist
	}
}
