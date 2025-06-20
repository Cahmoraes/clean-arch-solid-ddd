import { z } from 'zod'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'

import { InvalidPhoneNumberError } from '../error/invalid-phone-number-error'

export type PhoneCreate = string

const createPhoneSchema = z.union([
  z.undefined(),
  z.string().refine(checkValidPhoneString).transform(sanitizePhoneNumber),
])

function checkValidPhoneString(aString: string): boolean {
  const cleanValue = aString.replace(/\D/g, '')
  const parsed = parseInt(cleanValue, 10)
  return !isNaN(parsed) && cleanValue.length > 0
}

function sanitizePhoneNumber(aString: string): string {
  return aString.replace(/\D/g, '').trim()
}

type CreatePhoneData = z.infer<typeof createPhoneSchema>

export class Phone {
  private constructor(private readonly _value?: string) {}

  public static create(
    aStringOrNumber?: PhoneCreate,
  ): Either<InvalidPhoneNumberError, Phone> {
    const numberOrError = this.validate(aStringOrNumber)
    if (numberOrError.isFailure()) return failure(numberOrError.value)
    return success(new Phone(numberOrError.value))
  }

  private static validate(
    aStringOrNumber?: PhoneCreate,
  ): Either<InvalidPhoneNumberError, CreatePhoneData> {
    const numberOrError = createPhoneSchema.safeParse(aStringOrNumber)
    if (!numberOrError.success) return failure(new InvalidPhoneNumberError())
    return success(numberOrError.data)
  }

  public static restore(phone?: string): Phone {
    return new Phone(phone)
  }

  public toString(): string | undefined {
    return this._value?.toString()
  }

  get value(): string | undefined {
    return this._value
  }
}
