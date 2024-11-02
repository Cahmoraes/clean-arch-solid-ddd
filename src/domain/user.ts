import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { Optional } from '@/@types/optional'
import { type Either, left, right } from '@/domain/value-object/either'

import { Password } from './value-object/password'

export interface UserProps {
  id?: string
  name: string
  email: string
  password: Password
  createdAt: Date
}

type UserPropsWithoutPassword = Omit<UserProps, 'password'>

export type CreateUserProps = Optional<
  UserPropsWithoutPassword,
  'createdAt'
> & {
  password: string
}

export type RestoreUserProps = Omit<UserPropsWithoutPassword, 'password'> & {
  id: string
  password: string
}

const createUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
})

type CreateUserData = z.infer<typeof createUserSchema>

export class User {
  private readonly _id: string | null
  private readonly _name: string
  private readonly _email: string
  private readonly _password: Password
  private readonly _createdAt: Date

  private constructor(userDto: UserProps) {
    this._id = userDto.id ?? null
    this._name = userDto.name
    this._email = userDto.email
    this._password = userDto.password
    this._createdAt = userDto.createdAt
  }

  public static create(
    createUserProps: CreateUserProps,
  ): Either<ValidationError, User> {
    const userOrError = this.validate(createUserProps)
    if (userOrError.isLeft()) return left(fromError(userOrError.value))
    const passwordOrError = Password.create(createUserProps.password)
    if (passwordOrError.isLeft()) return left(passwordOrError.value)
    const createdAt = new Date()
    return right(
      new User({
        ...userOrError.value,
        createdAt,
        password: passwordOrError.value,
      }),
    )
  }

  private static validate(
    createUserProps: CreateUserProps,
  ): Either<ValidationError, CreateUserData> {
    const userOrError = createUserSchema.safeParse(createUserProps)
    if (!userOrError.success) return left(fromError(userOrError.error))
    return right(userOrError.data)
  }

  public static restore(restoreUserProps: RestoreUserProps) {
    return new User({
      id: restoreUserProps.id,
      email: restoreUserProps.email,
      name: restoreUserProps.name,
      password: Password.restore(restoreUserProps.password),
      createdAt: restoreUserProps.createdAt,
    })
  }

  get id(): string | null {
    return this._id
  }

  get name() {
    return this._name
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

  public checkPassword(raPassword: string): boolean {
    return this._password.compare(raPassword)
  }
}
