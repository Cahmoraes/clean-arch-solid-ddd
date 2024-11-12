import { z } from 'zod'

import { InvalidEmailError } from '../error/invalid-email-error'
import { type Either, left, right } from './either'

const createEmailSchema = z.string().email()

export class Email {
  private readonly _value: string

  private constructor(value: string) {
    this._value = value
  }

  public static create(aString: string): Either<InvalidEmailError, Email> {
    const emailOrError = this.validate(aString)
    if (emailOrError.isLeft()) return left(emailOrError.value)
    const email = new Email(emailOrError.value)
    return right(email)
  }

  private static validate(aString: string): Either<InvalidEmailError, string> {
    const emailOrError = createEmailSchema.safeParse(aString)
    if (!emailOrError.success) return left(new InvalidEmailError())
    return right(emailOrError.data)
  }

  public static restore(aString: string): Email {
    return new Email(aString)
  }

  get value(): string {
    return this._value
  }
}
