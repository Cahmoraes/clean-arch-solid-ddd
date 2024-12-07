import { z } from 'zod'

import { InvalidNameLengthError } from '../error/invalid-name-length-error'
import { type Either, failure, success } from './either'

const createNameSchema = z.string().min(5).max(30)

export class Name {
  constructor(private readonly _value: string) {}

  public static create(aString: string): Either<InvalidNameLengthError, Name> {
    const nameOrError = this.validate(aString)
    if (nameOrError.isFailure()) return failure(nameOrError.value)
    const name = new Name(nameOrError.value)
    return success(name)
  }

  private static validate(
    aString: string,
  ): Either<InvalidNameLengthError, string> {
    const nameOrError = createNameSchema.safeParse(aString)
    if (!nameOrError.success) return failure(new InvalidNameLengthError())
    return success(nameOrError.data)
  }

  public static restore(aString: string) {
    return new Name(aString)
  }

  get value() {
    return this._value
  }
}
