import { type ValidationError } from 'zod-validation-error'

import { type Either, failure, success } from '@/domain/value-object/either'

import type { InvalidNameLengthError } from './error/invalid-name-length-error'
import { Email } from './value-object/email'
import { Id } from './value-object/id'
import { Name } from './value-object/name'
import { Password } from './value-object/password'

export interface UserProps {
  id: Id
  name: Name
  email: Email
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

export type ValidatedUserProps = Omit<UserProps, 'id' | 'createdAt'>

export class User {
  private readonly _id: Id
  private readonly _name: Name
  private readonly _email: Email
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
    const validatedPropsOrError = this.validate(userCreateProps)
    if (validatedPropsOrError.isFailure()) {
      return failure(validatedPropsOrError.value)
    }
    const id = Id.create(userCreateProps.id)
    const createdAt = userCreateProps.createdAt ?? new Date()
    return success(
      new User({
        id,
        createdAt,
        name: validatedPropsOrError.value.name,
        email: validatedPropsOrError.value.email,
        password: validatedPropsOrError.value.password,
      }),
    )
  }

  private static validate(
    userCreateProps: UserCreateProps,
  ): Either<ValidationError | InvalidNameLengthError, ValidatedUserProps> {
    const nameOrError = Name.create(userCreateProps.name)
    if (nameOrError.isFailure()) return failure(nameOrError.value)
    const emailOrError = Email.create(userCreateProps.email)
    if (emailOrError.isFailure()) return failure(emailOrError.value)
    const passwordOrError = Password.create(userCreateProps.password)
    if (passwordOrError.isFailure()) return failure(passwordOrError.value)
    return success({
      name: nameOrError.value,
      email: emailOrError.value,
      password: passwordOrError.value,
    })
  }

  public static restore(restoreUserProps: RestoreUserProps) {
    return new User({
      id: Id.restore(restoreUserProps.id),
      email: Email.restore(restoreUserProps.email),
      name: Name.restore(restoreUserProps.name),
      password: Password.restore(restoreUserProps.password),
      createdAt: restoreUserProps.createdAt,
    })
  }

  get id(): string | null {
    return this._id.value
  }

  get name(): string {
    return this._name.value
  }

  get email(): string {
    return this._email.value
  }

  get password(): string {
    return this._password.value
  }

  get createdAt(): Date {
    return this._createdAt
  }

  public checkPassword(rawPassword: string): boolean {
    return this._password.compare(rawPassword)
  }
}
