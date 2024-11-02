import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { Optional } from '@/@types/optional'
import { type Either, left, right } from '@/domain/value-object/either'

import { Id } from './value-object/id'
import { Password } from './value-object/password'

export interface UserProps {
  id: Id
  name: string
  email: string
  password: Password
  createdAt: Date
}

type UserPropsWithoutIdAndPassword = Omit<UserProps, 'id' | 'password'>

export type UserCreateProps = Optional<
  UserPropsWithoutIdAndPassword,
  'createdAt'
> & {
  id?: string
  password: string
}

export type RestoreUserProps = Omit<
  UserPropsWithoutIdAndPassword,
  'password'
> & {
  id: string
  password: string
}

const createUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
})

type CreateUserData = z.infer<typeof createUserSchema>

export class User {
  private readonly _id: Id
  private readonly _name: string
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
    UserCreateProps: UserCreateProps,
  ): Either<ValidationError, User> {
    const userOrError = this.validate(UserCreateProps)
    if (userOrError.isLeft()) return left(fromError(userOrError.value))
    const passwordOrError = Password.create(UserCreateProps.password)
    if (passwordOrError.isLeft()) return left(passwordOrError.value)
    const id = Id.create(UserCreateProps.id)
    const createdAt = new Date()
    return right(
      new User({
        ...userOrError.value,
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
      name: restoreUserProps.name,
      password: Password.restore(restoreUserProps.password),
      createdAt: restoreUserProps.createdAt,
    })
  }

  get id(): string | null {
    return this._id.value
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

  public checkPassword(rawPassword: string): boolean {
    return this._password.compare(rawPassword)
  }
}
