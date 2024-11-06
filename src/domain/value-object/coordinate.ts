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

  public static create(props: CoordinateCreate) {
    return new Coordinate(props)
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
