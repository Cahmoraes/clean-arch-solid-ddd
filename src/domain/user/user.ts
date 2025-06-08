import { type ValidationError } from 'zod-validation-error'

import {
  type Either,
  failure,
  success,
} from '@/domain/shared/value-object/either'

import { DomainEventPublisher } from '../shared/event/domain-event-publisher'
import { Observable } from '../shared/observable'
import { Result } from '../shared/result'
import { Id } from '../shared/value-object/id'
import type { InvalidEmailError } from './error/invalid-email-error'
import type { InvalidNameLengthError } from './error/invalid-name-length-error'
import { PasswordChangedEvent } from './event/password-changed-event'
import { UserCreatedEvent } from './event/user-created-event'
import { UserProfileUpdatedEvent } from './event/user-profile-updated-event'
import { Email } from './value-object/email'
import { Name } from './value-object/name'
import { Password } from './value-object/password'
import { Role, type RoleTypes } from './value-object/role'
import {
  type StatusTypes,
  type UserStatus,
  UserStatusFactory,
} from './value-object/status'

export interface UserConstructor {
  id: Id
  name: Name
  email: Email
  password: Password
  role: Role
  createdAt: Date
  updatedAt?: Date
  status: StatusTypes
}

export interface UserCreate {
  id?: string | null
  name: string
  email: string
  password: string
  role?: RoleTypes
  createdAt?: Date
  updatedAt?: Date
  status?: StatusTypes
}

export type UserRestore = {
  id: string
  name: string
  email: string
  password: string
  role: RoleTypes
  createdAt: Date
  updatedAt?: Date
  status: StatusTypes
}

export type UserUpdateProps = Partial<Pick<UserCreate, 'name' | 'email'>>

export type ValidatedUserProps = Omit<
  UserConstructor,
  'id' | 'createdAt' | 'role' | 'status'
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
  private _updatedAt?: Date
  private _status: UserStatus

  private constructor(props: UserConstructor) {
    super()
    this._id = props.id
    this._name = props.name
    this._email = props.email
    this._password = props.password
    this._role = props.role
    this._createdAt = props.createdAt
    this._updatedAt = props.updatedAt
    this._status = UserStatusFactory.create(this, props.status)
  }

  public static create(
    userCreateProps: UserCreate,
  ): Either<UserValidationErrors[], User> {
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
        status: userCreateProps.status ?? 'activated',
      }),
    )
  }

  private static validate(
    userCreateProps: UserCreate,
  ): Either<UserValidationErrors[], ValidatedUserProps> {
    const nameResult = Name.create(userCreateProps.name)
    const emailResult = Email.create(userCreateProps.email)
    const passwordResult = Password.create(userCreateProps.password)
    const result = Result.combine([nameResult, emailResult, passwordResult])
    if (!result.isValid) return failure(result.errors)
    return success({
      email: emailResult.forceSuccess().value,
      name: nameResult.forceSuccess().value,
      password: passwordResult.forceSuccess().value,
    })
  }

  private static createUserCreatedEvent(
    userCreateProps: Pick<UserCreate, 'name' | 'email'>,
  ) {
    return new UserCreatedEvent({
      name: userCreateProps.name,
      email: userCreateProps.email,
    })
  }

  public static restore(restoreUserProps: UserRestore) {
    return new User({
      id: Id.restore(restoreUserProps.id),
      email: Email.restore(restoreUserProps.email),
      name: Name.restore(restoreUserProps.name),
      password: Password.restore(restoreUserProps.password),
      role: Role.restore(restoreUserProps.role),
      createdAt: restoreUserProps.createdAt,
      updatedAt: restoreUserProps.updatedAt,
      status: restoreUserProps.status,
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

  get updatedAt(): Date | undefined {
    return this._updatedAt
  }

  private refreshUpdatedAt() {
    this._updatedAt = new Date()
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
    this.refreshUpdatedAt()
    const event = new PasswordChangedEvent({
      name: this.name,
      email: this.email,
    })
    this.notify(event)
    return success(null)
  }

  public updateProfile(
    input: UserUpdateProps,
  ): Either<UserValidationErrors[], null> {
    const userCreateResult = User.create({
      id: this.id,
      name: input.name ?? this.name,
      email: input.email ?? this.email,
      password: this.password,
      role: this.role,
      createdAt: this.createdAt,
      status: this._status.type,
    })
    if (userCreateResult.isFailure()) return failure(userCreateResult.value)
    this._email = userCreateResult.value._email
    this._name = userCreateResult.value._name
    void this.refreshUpdatedAt()
    const event = this.createUserProfileUpdatedEvent({
      email: this.email,
      name: this.name,
    })
    this.notify(event)
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

  public changeStatus(userStatus: UserStatus): void {
    this._status = userStatus
  }

  public suspend(): void {
    this._status.suspend()
  }

  public get isSuspend(): boolean {
    return this._status.type === 'suspended'
  }

  public activate(): void {
    this._status.activate()
  }

  public get isActive(): boolean {
    return this._status.type === 'activated'
  }
}
