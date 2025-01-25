import { InvalidDistanceError } from '../error/invalid-distance-error'
import { Coordinate } from './coordinate'
import { type Either, failure, success } from './either'

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

  get from(): Coordinate {
    return this._from
  }

  get to(): Coordinate {
    return this._to
  }

  get value(): number {
    if (
      this._from.latitude === this._to.latitude &&
      this._from.longitude === this._to.longitude
    ) {
      return 0
    }
    const fromRadian = (Math.PI * this._from.latitude) / 180
    const toRadian = (Math.PI * this._to.latitude) / 180
    const theta = this._from.longitude - this._to.longitude
    const radTheta = (Math.PI * theta) / 180
    let dist =
      Math.sin(fromRadian) * Math.sin(toRadian) +
      Math.cos(fromRadian) * Math.cos(toRadian) * Math.cos(radTheta)
    if (dist > 1) {
      dist = 1
    }
    dist = Math.acos(dist)
    dist = (dist * 180) / Math.PI
    dist = dist * 60 * 1.1515
    dist = dist * 1.609344
    return dist
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
}
