import type { ValidationError } from 'zod-validation-error'

import type { Optional } from '@/@types/optional'
import { type Either, left, right } from '@/application/either'

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
  updatedAt?: Date
}

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
    createUser: CreateUserProps,
  ): Either<ValidationError, User> {
    const passwordOrError = Password.create(createUser.password)
    if (passwordOrError.isLeft()) return left(passwordOrError.value)
    const createdAt = new Date()
    return right(
      new User({
        ...createUser,
        createdAt,
        password: passwordOrError.value,
      }),
    )
  }

  public static restore(restoreUser: RestoreUserProps) {
    return new User({
      id: restoreUser.id,
      email: restoreUser.email,
      name: restoreUser.name,
      password: Password.restore(restoreUser.password),
      createdAt: restoreUser.createdAt,
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
