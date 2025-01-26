import { type ValidationError } from 'zod-validation-error'

import { type Either, failure, success } from '@/domain/value-object/either'

import type { InvalidEmailError } from './error/invalid-email-error'
import type { InvalidNameLengthError } from './error/invalid-name-length-error'
import { DomainEventPublisher } from './event/domain-event-publisher'
import { PasswordChangedEvent } from './event/password-changed-event'
import { UserCreatedEvent } from './event/user-created-event'
import type { Cloneable } from './interfaces/cloneable'
import { Observable } from './observable'
import { Email } from './value-object/email'
import { Id } from './value-object/id'
import { Name } from './value-object/name'
import { Password } from './value-object/password'
import { Role, type RoleTypes } from './value-object/role'

export interface UserConstructorProps {
  id: Id
  name: Name
  email: Email
  password: Password
  role: Role
  createdAt: Date
}

export interface UserCreateProps {
  id?: string | null
  name: string
  email: string
  password: string
  role?: RoleTypes
  createdAt?: Date
}

export type UserRestoreProps = {
  id: string
  name: string
  email: string
  password: string
  role: RoleTypes
  createdAt: Date
}

export type UpdateUserProps = Partial<Pick<UserCreateProps, 'name' | 'email'>>

export type ValidatedUserProps = Omit<
  UserConstructorProps,
  'id' | 'createdAt' | 'role'
>

export type UserValidationErrors =
  | ValidationError
  | InvalidNameLengthError
  | InvalidEmailError

export class User
  extends Observable
  implements Cloneable<UpdateUserProps, Either<UserValidationErrors, User>>
{
  private readonly _id: Id
  private readonly _name: Name
  private readonly _email: Email
  private _password: Password
  private readonly _role: Role
  private readonly _createdAt: Date

  private constructor(props: UserConstructorProps) {
    super()
    this._id = props.id
    this._name = props.name
    this._email = props.email
    this._password = props.password
    this._role = props.role
    this._createdAt = props.createdAt
  }

  public static create(
    userCreateProps: UserCreateProps,
  ): Either<UserValidationErrors, User> {
    const validatedPropsOrError = this.validate(userCreateProps)
    if (validatedPropsOrError.isFailure()) {
      return failure(validatedPropsOrError.value)
    }
    const id = Id.create(userCreateProps.id)
    const createdAt = userCreateProps.createdAt ?? new Date()
    const role = Role.create(userCreateProps.role)
    DomainEventPublisher.instance.publish(
      this.createUserCreatedEvent(userCreateProps),
    )
    return success(
      new User({
        id,
        createdAt,
        name: validatedPropsOrError.value.name,
        email: validatedPropsOrError.value.email,
        password: validatedPropsOrError.value.password,
        role: role,
      }),
    )
  }

  private static validate(
    userCreateProps: UserCreateProps,
  ): Either<
    ValidationError | InvalidNameLengthError | InvalidEmailError,
    ValidatedUserProps
  > {
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

  private static createUserCreatedEvent(
    userCreateProps: Pick<UserCreateProps, 'name' | 'email'>,
  ) {
    return new UserCreatedEvent({
      name: userCreateProps.name,
      email: userCreateProps.email,
    })
  }

  public static restore(restoreUserProps: UserRestoreProps) {
    return new User({
      id: Id.restore(restoreUserProps.id),
      email: Email.restore(restoreUserProps.email),
      name: Name.restore(restoreUserProps.name),
      password: Password.restore(restoreUserProps.password),
      role: Role.create(restoreUserProps.role),
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

  get role(): RoleTypes {
    return this._role.value
  }

  get createdAt(): Date {
    return this._createdAt
  }

  public checkPassword(rawPassword: string): boolean {
    return this._password.compare(rawPassword)
  }

  public changePassword(newRawPassword: string): Either<ValidationError, null> {
    const passwordOrError = Password.create(newRawPassword)
    if (passwordOrError.isFailure()) return failure(passwordOrError.value)
    this._password = passwordOrError.value
    const event = new PasswordChangedEvent({
      name: this.name,
      email: this.email,
    })
    this.notifyObservers(event)
    return success(null)
  }

  public clone(input?: UpdateUserProps): Either<UserValidationErrors, User> {
    if (!input) {
      const user = new User({
        id: this._id,
        name: this._name,
        email: this._email,
        password: this._password,
        role: this._role,
        createdAt: this._createdAt,
      })
      return success(user)
    }
    const password = this._password
    const userOrError = User.create({
      id: this.id,
      name: input.name ?? this.name,
      email: input.email ?? this.email,
      password: this.password,
      role: this.role,
      createdAt: this.createdAt,
    })
    if (userOrError.isFailure()) return failure(userOrError.value)
    userOrError.value._password = password
    return success(userOrError.value)
  }
}
