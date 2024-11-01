import bcrypt from 'bcryptjs'

import { env } from '@/infra/env'

export class Password {
  private constructor(private readonly _value: string) {}

  public static create(rawPassword: string) {
    const salt = bcrypt.genSaltSync(env.PASSWORD_SALT)
    const hashedPassword = bcrypt.hashSync(rawPassword, salt)
    return new Password(hashedPassword)
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
