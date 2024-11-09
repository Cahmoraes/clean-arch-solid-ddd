import { InvalidLatitudeError } from '../error/invalid-latitude-error'
import { InvalidLongitudeError } from '../error/invalid-longitude-error'
import { type Either, left, right } from './either'

export interface CoordinateCreate {
  latitude: number
  longitude: number
}

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
    const coordsOrError = this.validate(props)
    if (coordsOrError.isLeft()) return left(coordsOrError.value)
    const coordinate = new Coordinate(coordsOrError.value)
    return right(coordinate)
  }

  private static validate(
    props: CoordinateCreate,
  ): Either<Error, CoordinateCreate> {
    if (props.latitude < -90 || props.latitude > 90) {
      return left(new InvalidLatitudeError())
    }
    if (props.longitude < -180 || props.longitude > 180) {
      return left(new InvalidLongitudeError())
    }
    return right(props)
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
}
