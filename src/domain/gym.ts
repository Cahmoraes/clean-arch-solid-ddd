import type { InvalidNameLengthError } from './error/invalid-name-length-error'
import { Coordinate } from './value-object/coordinate'
import { type Either, left, right } from './value-object/either'
import { Id } from './value-object/id'
import { Name } from './value-object/name'
import type { Phone } from './value-object/phone'

interface GymConstructor {
  id: Id
  title: Name
  description?: string
  phone?: Phone
  coordinate: Coordinate
}

export type GymCreateProps = Omit<
  GymConstructor,
  'id' | 'coordinate' | 'title'
> & {
  id?: string
  title: string
  latitude: number
  longitude: number
}

export type GymRestoreProps = Omit<
  GymConstructor,
  'id' | 'coordinate' | 'title'
> & {
  id: string
  title: string
  latitude: number
  longitude: number
}

export class Gym {
  private readonly _id: Id
  private readonly _title: Name
  private readonly _description?: string
  private readonly _phone?: Phone
  private readonly _coordinate: Coordinate

  private constructor(gymProps: GymConstructor) {
    this._id = gymProps.id
    this._title = gymProps.title
    this._description = gymProps.description
    this._phone = gymProps.phone
    this._coordinate = gymProps.coordinate
  }

  public static create(
    gymProps: GymCreateProps,
  ): Either<InvalidNameLengthError, Gym> {
    const id = Id.create(gymProps.id)
    const nameOrError = Name.create(gymProps.title)
    if (nameOrError.isLeft()) return left(nameOrError.value)
    const coordinateOrError = Coordinate.create({
      latitude: gymProps.latitude,
      longitude: gymProps.longitude,
    })
    if (coordinateOrError.isLeft()) return left(coordinateOrError.value)
    const gym = new Gym({
      ...gymProps,
      id,
      coordinate: coordinateOrError.value,
      title: nameOrError.value,
    })
    return right(gym)
  }

  public static restore(gymProps: GymRestoreProps): Gym {
    const id = Id.restore(gymProps.id)
    const title = Name.restore(gymProps.title)
    const coordinate = Coordinate.restore({
      latitude: gymProps.latitude,
      longitude: gymProps.longitude,
    })
    return new Gym({ ...gymProps, id, coordinate, title })
  }

  get id(): string | null {
    return this._id.value
  }

  get title(): string {
    return this._title.value
  }

  get description(): string | undefined {
    return this._description
  }

  get phone(): number | undefined {
    return this._phone?.value
  }

  get latitude(): number {
    return this._coordinate.latitude
  }

  get longitude(): number {
    return this._coordinate.longitude
  }
}
