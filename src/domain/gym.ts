import { Coordinate } from './value-object/coordinate'
import { Id } from './value-object/id'

interface GymConstructor {
  id: Id
  title: string
  description?: string
  phone?: string
  coordinate: Coordinate
}

export type GymCreateProps = Omit<GymConstructor, 'id' | 'coordinate'> & {
  id?: string
  latitude: number
  longitude: number
}

export type GymRestoreProps = Omit<GymConstructor, 'id' | 'coordinate'> & {
  id: string
  latitude: number
  longitude: number
}

export class Gym {
  private readonly _id: Id
  private readonly _title: string
  private readonly _description?: string
  private readonly _phone?: string
  private readonly _coordinate: Coordinate

  private constructor(gymProps: GymConstructor) {
    this._id = gymProps.id
    this._title = gymProps.title
    this._description = gymProps.description
    this._phone = gymProps.phone
    this._coordinate = gymProps.coordinate
  }

  public static create(gymProps: GymCreateProps): Gym {
    const id = Id.create(gymProps.id)
    const coordinate = Coordinate.create({
      latitude: gymProps.latitude,
      longitude: gymProps.longitude,
    })
    return new Gym({ ...gymProps, id, coordinate })
  }

  public static restore(gymProps: GymRestoreProps): Gym {
    const id = Id.restore(gymProps.id)
    const coordinate = Coordinate.restore({
      latitude: gymProps.latitude,
      longitude: gymProps.longitude,
    })
    return new Gym({ ...gymProps, id, coordinate })
  }

  get id(): string | null {
    return this._id.value
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
    return this._coordinate.latitude
  }

  get longitude(): number {
    return this._coordinate.longitude
  }
}
