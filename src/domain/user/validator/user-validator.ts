import ExtendedSet from '@cahmoraes93/extended-set'

import type { Either } from '@/domain/shared/value-object/either'

import { Email } from '../value-object/email'
import { Name } from '../value-object/name'
import { Password } from '../value-object/password'

export class Notification {
  private readonly _errors: ExtendedSet<string>

  constructor() {
    this._errors = new ExtendedSet<string>()
  }

  get errors(): string[] {
    return this._errors.toArray()
  }

  addError(error: string): void {
    this._errors.add(error)
  }

  hasErrors(): boolean {
    return this._errors.size > 0
  }
}

export interface UserValidatorConstructor {
  name: Either<Error, Name>
  email: Either<Error, Email>
  password: Either<Error, Password>
}

export type ValidateAndCreateError = {
  error: string[]
  userProps: null
}

export type ValidateAndCreateSuccess = {
  error: null
  userProps: {
    name: Name
    email: Email
    password: Password
  }
}

export type ValidateAndCreateResult =
  | ValidateAndCreateError
  | ValidateAndCreateSuccess

export class UserValidator {
  private readonly notification: Notification
  private readonly props: UserValidatorConstructor

  constructor(props: UserValidatorConstructor) {
    this.notification = new Notification()
    this.props = props
  }

  public validate(): ValidateAndCreateResult {
    if (this.props.name.isFailure()) {
      this.notification.addError(this.props.name.value.message)
    }
    if (this.props.email.isFailure()) {
      this.notification.addError(this.props.email.value.message)
    }
    if (this.props.password.isFailure()) {
      this.notification.addError(this.props.password.value.message)
    }
    if (this.notification.hasErrors()) {
      return {
        error: this.notification.errors,
        userProps: null,
      }
    }
    return {
      error: null,
      userProps: {
        name: this.props.name.value,
        email: this.props.email.value,
        password: this.props.password.value,
      },
    } as ValidateAndCreateResult
  }
}
