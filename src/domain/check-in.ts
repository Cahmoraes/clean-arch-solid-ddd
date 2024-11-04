/*
  id           String   @id @default(uuid())
  created_at   DateTime @default(now())
  validated_at DateTime

  user    User   @relation(fields: [user_id], references: [id])
  user_id String

  gym    Gym    @relation(fields: [gym_id], references: [id])
  gym_id String

*/

import type { Optional } from '@/@types/optional'

import { Id } from './value-object/id'

interface CheckInProps {
  id: Id
  userId: Id
  gymId: Id
  createdAt: Date
  validatedAt?: Date
}

export type CheckInCreateProps = Omit<
  Optional<CheckInProps, 'id' | 'createdAt'>,
  'id' | 'userId' | 'gymId'
> & {
  id?: string
  userId: string
  gymId: string
}

export type CheckInRestoreProps = {
  id: string
  userId: string
  gymId: string
  createdAt: Date
  validatedAt?: Date
}

export class CheckIn {
  private readonly _id: Id
  private readonly _userId: Id
  private readonly _gymId: Id
  private readonly _createdAt: Date
  private readonly _validatedAt?: Date

  private constructor(props: CheckInProps) {
    this._id = props.id
    this._userId = props.userId
    this._gymId = props.gymId
    this._createdAt = props.createdAt
    this._validatedAt = props.validatedAt
  }

  public static create(props: CheckInCreateProps) {
    const id = Id.create(props.id)
    const userId = Id.create(props.userId)
    const gymId = Id.create(props.gymId)
    const createdAt = new Date()
    return new CheckIn({
      id,
      userId,
      gymId,
      createdAt,
    })
  }

  public static restore(props: CheckInRestoreProps) {
    return new CheckIn({
      id: Id.create(props.id),
      userId: Id.create(props.userId),
      gymId: Id.create(props.gymId),
      createdAt: props.createdAt,
      validatedAt: props.validatedAt,
    })
  }

  get id(): string | null {
    return this._id.value
  }

  get userId(): string | null {
    return this._userId.value
  }

  get gymId(): string | null {
    return this._gymId.value
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get validatedAt(): Date | undefined {
    return this._validatedAt
  }
}
