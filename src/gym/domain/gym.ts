import type { InvalidLatitudeError } from '@/check-in/domain/error/invalid-latitude-error'
import type { InvalidLongitudeError } from '@/check-in/domain/error/invalid-longitude-error'
import { Coordinate } from '@/check-in/domain/value-object/coordinate'
import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { Id } from '@/shared/domain/value-object/id'
import type { InvalidNameLengthError } from '@/user/domain/error/invalid-name-length-error'
import { Name } from '@/user/domain/value-object/name'
import { Phone } from '@/user/domain/value-object/phone'

import type { InvalidCNPJError } from './error/invalid-cnpj-error'
import { CNPJ } from './value-object/CNPJ'

interface GymConstructor {
  id: Id
  cnpj: CNPJ
  title: Name
  description?: string
  phone: Phone
  coordinate: Coordinate
}

export type GymCreateProps = Omit<
  GymConstructor,
  'id' | 'coordinate' | 'title' | 'phone' | 'cnpj'
> & {
  id?: string
  phone?: string
  title: string
  latitude: number
  longitude: number
  cnpj: string
}

export type GymRestoreProps = Omit<
  GymConstructor,
  'id' | 'coordinate' | 'title' | 'phone' | 'cnpj'
> & {
  id: string
  phone?: string
  title: string
  latitude: number
  longitude: number
  cnpj: string
}

export class Gym {
  private readonly _id: Id
  private readonly _title: Name
  private readonly _description?: string
  private readonly _phone?: Phone
  private readonly _coordinate: Coordinate
  private readonly _cnpj: CNPJ

  private constructor(gymProps: GymConstructor) {
    this._id = gymProps.id
    this._title = gymProps.title
    this._description = gymProps.description
    this._phone = gymProps.phone
    this._coordinate = gymProps.coordinate
    this._cnpj = gymProps.cnpj
  }

  public static create(
    gymProps: GymCreateProps,
  ): Either<
    | InvalidNameLengthError
    | InvalidLatitudeError
    | InvalidLongitudeError
    | InvalidCNPJError,
    Gym
  > {
    const id = Id.create(gymProps.id)
    const nameOrError = Name.create(gymProps.title)
    if (nameOrError.isFailure()) return failure(nameOrError.value)
    const coordinateOrError = Coordinate.create({
      latitude: gymProps.latitude,
      longitude: gymProps.longitude,
    })
    if (coordinateOrError.isFailure()) return failure(coordinateOrError.value)
    const phoneOrError = Phone.create(gymProps.phone)
    if (phoneOrError.isFailure()) return failure(phoneOrError.value)
    const cnpjOrError = CNPJ.create(gymProps.cnpj)
    if (cnpjOrError.isFailure()) return failure(cnpjOrError.value)
    const gym = new Gym({
      ...gymProps,
      id,
      coordinate: coordinateOrError.value,
      title: nameOrError.value,
      phone: phoneOrError.value,
      cnpj: cnpjOrError.value,
    })
    return success(gym)
  }

  public static restore(gymProps: GymRestoreProps): Gym {
    const id = Id.restore(gymProps.id)
    const title = Name.restore(gymProps.title)
    const phone = Phone.restore(gymProps.phone)
    const coordinate = Coordinate.restore({
      latitude: gymProps.latitude,
      longitude: gymProps.longitude,
    })
    const cnpj = CNPJ.restore(gymProps.cnpj)
    return new Gym({ ...gymProps, id, coordinate, title, phone, cnpj })
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

  get phone(): string | undefined {
    return this._phone?.value
  }

  get latitude(): number {
    return this._coordinate.latitude
  }

  get longitude(): number {
    return this._coordinate.longitude
  }

  get cnpj(): string {
    return this._cnpj.value
  }
}
