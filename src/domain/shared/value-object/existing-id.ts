import { InvalidIdError } from '../error/invalid-id-error'

export class ExistingId {
  private constructor(private readonly _value: string) {}

  get value(): string {
    return this._value
  }

  public static create(aString: string) {
    if (!aString) throw new InvalidIdError()
    return new ExistingId(aString)
  }

  public static restore(aString: string) {
    return new ExistingId(aString)
  }

  public equals(other: unknown): boolean {
    if (!(other instanceof ExistingId)) return false
    return other._value === this._value
  }
}
