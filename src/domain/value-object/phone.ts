import { z } from 'zod'

import { InvalidPhoneNumberError } from '../error/invalid-phone-number-error'
import { type Either, left, right } from './either'

export type PhoneCreate = string | number

const createPhoneSchema = z
  .union([z.string(), z.number(), z.undefined()])
  .transform((value) => (value === undefined ? undefined : Number(value)))
  .refine((value) => value === undefined || !isNaN(value))

type CreatePhoneData = z.infer<typeof createPhoneSchema>

export class Phone {
  private constructor(private readonly _value?: number) {}

  public static create(
    aStringOrNumber: PhoneCreate,
  ): Either<InvalidPhoneNumberError, Phone> {
    const numberOrError = this.validate(aStringOrNumber)
    if (numberOrError.isLeft()) return left(numberOrError.value)
    return right(new Phone(numberOrError.value))
  }

  private static validate(
    aStringOrNumber: PhoneCreate,
  ): Either<InvalidPhoneNumberError, CreatePhoneData> {
    const numberOrError = createPhoneSchema.safeParse(aStringOrNumber)
    if (!numberOrError.success) return left(new InvalidPhoneNumberError())
    return right(numberOrError.data)
  }

  public static restore(phone: number): Phone {
    return new Phone(phone)
  }

  public toString(): string | undefined {
    return this._value?.toString()
  }

  get value(): number | undefined {
    return this._value
  }
}
