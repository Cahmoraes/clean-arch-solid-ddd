import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import { type Either, left, right } from '@/domain/value-object/either'

import type { InvalidNameLengthError } from './error/invalid-name-length-error'
import { Id } from './value-object/id'
import { Name } from './value-object/name'
import { Password } from './value-object/password'

export interface UserProps {
  id: Id
  name: Name
  email: string
  password: Password
  createdAt: Date
}

export interface UserCreateProps {
  id?: string
  name: string
  email: string
  password: string
  createdAt?: Date
}

export interface RestoreUserProps {
  id: string
  name: string
  email: string
  password: string
  createdAt: Date
}

const createUserSchema = z.object({
  email: z.string().email(),
})

type CreateUserData = z.infer<typeof createUserSchema>

export class User {
  private readonly _id: Id
  private readonly _name: Name
  private readonly _email: string
  private readonly _password: Password
  private readonly _createdAt: Date

  private constructor(userDto: UserProps) {
    this._id = userDto.id
    this._name = userDto.name
    this._email = userDto.email
    this._password = userDto.password
    this._createdAt = userDto.createdAt
  }

  public static create(
    userCreateProps: UserCreateProps,
  ): Either<ValidationError | InvalidNameLengthError, User> {
    const userOrError = this.validate(userCreateProps)
    if (userOrError.isLeft()) return left(fromError(userOrError.value))
    const nameOrError = Name.create(userCreateProps.name)
    if (nameOrError.isLeft()) return left(nameOrError.value)
    const passwordOrError = Password.create(userCreateProps.password)
    if (passwordOrError.isLeft()) return left(passwordOrError.value)
    const id = Id.create(userCreateProps.id)
    const createdAt = userCreateProps.createdAt ?? new Date()
    return right(
      new User({
        ...userOrError.value,
        name: nameOrError.value,
        id,
        createdAt,
        password: passwordOrError.value,
      }),
    )
  }

  private static validate(
    createUserProps: UserCreateProps,
  ): Either<ValidationError, CreateUserData> {
    const userOrError = createUserSchema.safeParse(createUserProps)
    if (!userOrError.success) return left(fromError(userOrError.error))
    return right(userOrError.data)
  }

  public static restore(restoreUserProps: RestoreUserProps) {
    return new User({
      id: Id.restore(restoreUserProps.id),
      email: restoreUserProps.email,
      name: Name.restore(restoreUserProps.name),
      password: Password.restore(restoreUserProps.password),
      createdAt: restoreUserProps.createdAt,
    })
  }

  get id(): string | null {
    return this._id.value
  }

  get name() {
    return this._name.value
  }

  get email() {
    return this._email
  }

  get password() {
    return this._password.value
  }

  get createdAt() {
    return this._createdAt
  }

  public checkPassword(rawPassword: string): boolean {
    return this._password.compare(rawPassword)
  }
}
