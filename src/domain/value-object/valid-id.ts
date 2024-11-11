import { InvalidIdError } from '../error/invalid-id-error'

export class ValidId {
  private constructor(private readonly _value: string) {}

  get value(): string {
    return this._value
  }

  public static create(aString: string) {
    if (!aString) throw new InvalidIdError()
    return new ValidId(aString)
  }

  public static restore(aString: string) {
    return new ValidId(aString)
  }

  public equals(other: unknown): boolean {
    if (!(other instanceof ValidId)) return false
    return other._value === this._value
  }
}
