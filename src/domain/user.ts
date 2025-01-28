import { type ValidationError } from 'zod-validation-error'

import { type Either, failure, success } from '@/domain/value-object/either'

import type { InvalidEmailError } from './error/invalid-email-error'
import type { InvalidNameLengthError } from './error/invalid-name-length-error'
import { DomainEventPublisher } from './event/domain-event-publisher'
import { PasswordChangedEvent } from './event/password-changed-event'
import { UserCreatedEvent } from './event/user-created-event'
import { UserProfileUpdatedEvent } from './event/user-profile-updated-event'
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

export type UserUpdateProps = Partial<Pick<UserCreateProps, 'name' | 'email'>>

export type ValidatedUserProps = Omit<
  UserConstructorProps,
  'id' | 'createdAt' | 'role'
>

export type UserValidationErrors =
  | ValidationError
  | InvalidNameLengthError
  | InvalidEmailError

export class User extends Observable {
  private _id: Id
  private _name: Name
  private _email: Email
  private _password: Password
  private _role: Role
  private _createdAt: Date

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
    const validatePropsResult = this.validate(userCreateProps)
    if (validatePropsResult.isFailure()) {
      return failure(validatePropsResult.value)
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
        name: validatePropsResult.value.name,
        email: validatePropsResult.value.email,
        password: validatePropsResult.value.password,
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
    const createNameResult = Name.create(userCreateProps.name)
    if (createNameResult.isFailure()) return failure(createNameResult.value)
    const createEmailResult = Email.create(userCreateProps.email)
    if (createEmailResult.isFailure()) return failure(createEmailResult.value)
    const createPasswordResult = Password.create(userCreateProps.password)
    if (createPasswordResult.isFailure()) {
      return failure(createPasswordResult.value)
    }
    return success({
      name: createNameResult.value,
      email: createEmailResult.value,
      password: createPasswordResult.value,
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
      role: Role.restore(restoreUserProps.role),
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
    const passwordCreateResult = Password.create(newRawPassword)
    if (passwordCreateResult.isFailure()) {
      return failure(passwordCreateResult.value)
    }
    this._password = passwordCreateResult.value
    const event = new PasswordChangedEvent({
      name: this.name,
      email: this.email,
    })
    this.notifyObservers(event)
    return success(null)
  }

  public updateProfile(
    input: UserUpdateProps,
  ): Either<UserValidationErrors, null> {
    const userCreateResult = User.create({
      id: this.id,
      name: input.name ?? this.name,
      email: input.email ?? this.email,
      password: this.password,
      role: this.role,
      createdAt: this.createdAt,
    })
    if (userCreateResult.isFailure()) return failure(userCreateResult.value)
    this._email = userCreateResult.value._email
    this._name = userCreateResult.value._name
    const event = this.createUserProfileUpdatedEvent({
      email: this.email,
      name: this.name,
    })
    this.notifyObservers(event)
    return success(null)
  }

  private createUserProfileUpdatedEvent(
    updateUserProps: Required<UserUpdateProps>,
  ) {
    return new UserProfileUpdatedEvent({
      name: updateUserProps.name,
      email: updateUserProps.email,
    })
  }
}
