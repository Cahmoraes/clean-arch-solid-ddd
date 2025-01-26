import type { ValueObject } from './value-object'

type StringOrNullable = string | null | undefined

export class Id implements ValueObject {
  private readonly _value: null | string

  private constructor(aString: StringOrNullable) {
    this._value = aString ?? null
  }

  get value(): null | string {
    return this._value
  }

  public static create(aString: StringOrNullable) {
    return new Id(aString)
  }

  public static restore(aString: string) {
    return new Id(aString)
  }

  public equals(other: unknown): boolean {
    if (!(other instanceof Id)) return false
    return other._value === this._value
  }
}
