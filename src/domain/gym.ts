interface GymConstructor {
  title: string
  description?: string
  phone?: string
  latitude: number
  longitude: number
}

export type GymCreateProps = GymConstructor

export class Gym {
  private readonly _title: string
  private readonly _description?: string
  private readonly _phone?: string
  private readonly _latitude: number
  private readonly _longitude: number

  private constructor(gymProps: GymConstructor) {
    this._title = gymProps.title
    this._description = gymProps.description
    this._phone = gymProps.phone
    this._latitude = gymProps.latitude
    this._longitude = gymProps.longitude
  }

  public static create(gymProps: GymCreateProps): Gym {
    return new Gym(gymProps)
  }

  public static restore(gymProps: GymCreateProps): Gym {
    return new Gym(gymProps)
  }

  get title(): string {
    return this._title
  }

  get description(): string | undefined {
    return this._description
  }

  get phone(): string | undefined {
    return this._phone
  }

  get latitude(): number {
    return this._latitude
  }

  get longitude(): number {
    return this._longitude
  }
}
