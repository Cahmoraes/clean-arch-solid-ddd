import { genSalt, hash } from 'bcryptjs'

export class Password {
  private constructor(private readonly _value: string) {}

  public static async create(rawPassword: string) {
    const salt = await genSalt(10)
    const hashedPassword = await hash(rawPassword, salt)
    return new Password(hashedPassword)
  }

  public static restore(hashedPassword: string) {
    return new Password(hashedPassword)
  }

  get value() {
    return this._value
  }
}
