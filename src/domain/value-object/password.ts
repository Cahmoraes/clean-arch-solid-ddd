import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import { type Either, left, right } from '@/application/either'
import { env } from '@/infra/env'

const PasswordSchema = z.string().min(6)
export type PasswordValue = z.infer<typeof PasswordSchema>

export class Password {
  private constructor(private readonly _value: string) {}

  public static create(rawPassword: string): Either<ValidationError, Password> {
    const passwordParsed = PasswordSchema.safeParse(rawPassword)
    if (!passwordParsed.success) return left(fromError(passwordParsed.error))
    const salt = bcrypt.genSaltSync(env.PASSWORD_SALT)
    const hashedPassword = bcrypt.hashSync(rawPassword, salt)
    return right(new Password(hashedPassword))
  }

  public static restore(hashedPassword: string) {
    return new Password(hashedPassword)
  }

  get value() {
    return this._value
  }

  public compare(aString: string): boolean {
    return bcrypt.compareSync(aString, this._value)
  }
}
