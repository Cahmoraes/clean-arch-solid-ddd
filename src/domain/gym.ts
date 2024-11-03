import type { Optional } from '@/@types/optional'

import { Id } from './value-object/id'

interface GymConstructor {
  id: Id
  title: string
  description?: string
  phone?: string
  latitude: number
  longitude: number
  createdAt: Date
  validatedAt?: Date
}

export type GymCreateProps = Optional<
  Omit<GymConstructor, 'id' | 'validatedAt'>,
  'createdAt'
> & {
  id?: string
}

export type GymRestoreProps = Omit<GymConstructor, 'id'> & {
  id: string
}

export class Gym {
  private readonly _id: Id
  private readonly _title: string
  private readonly _description?: string
  private readonly _phone?: string
  private readonly _latitude: number
  private readonly _longitude: number
  private readonly _createdAt: Date
  private readonly _validatedAt?: Date

  private constructor(gymProps: GymConstructor) {
    this._id = gymProps.id
    this._title = gymProps.title
    this._description = gymProps.description
    this._phone = gymProps.phone
    this._latitude = gymProps.latitude
    this._longitude = gymProps.longitude
    this._createdAt = gymProps.createdAt
    this._validatedAt = gymProps.validatedAt
  }

  public static create(gymProps: GymCreateProps): Gym {
    const createdAt = new Date()
    const id = Id.create(gymProps.id)
    return new Gym({ ...gymProps, createdAt, id })
  }

  public static restore(gymProps: GymRestoreProps): Gym {
    const id = Id.restore(gymProps.id)
    return new Gym({ ...gymProps, id })
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
    return this._latitude
  }

  get longitude(): number {
    return this._longitude
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get validatedAt(): Date | undefined {
    return this._validatedAt
  }
}
