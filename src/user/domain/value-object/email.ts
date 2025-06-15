import { z } from 'zod'

import { type Either, failure, success } from '@/shared/domain/value-object/either'
import { InvalidEmailError } from '../error/invalid-email-error'

const createEmailSchema = z.string().email()

export class Email {
  private readonly _value: string

  private constructor(value: string) {
    this._value = value
  }

  public static create(aString: string): Either<InvalidEmailError, Email> {
    const emailOrError = this.validate(aString)
    if (emailOrError.isFailure()) return failure(emailOrError.value)
    const email = new Email(emailOrError.value)
    return success(email)
  }

  private static validate(aString: string): Either<InvalidEmailError, string> {
    const emailOrError = createEmailSchema.safeParse(aString)
    if (!emailOrError.success) return failure(new InvalidEmailError())
    return success(emailOrError.data)
  }

  public static restore(aString: string): Email {
    return new Email(aString)
  }

  get value(): string {
    return this._value
  }
}
