import { randomUUID } from "node:crypto"
import type { ValueObject } from "./value-object"

type StringOrNullable = string | null | undefined

export class Id implements ValueObject {
	private readonly _value: string

	private constructor(aString: string) {
		this._value = aString
	}

	get value(): string {
		return this._value
	}

	public static create(aString?: StringOrNullable) {
		return new Id(aString ?? randomUUID())
	}

	public static restore(aString: string) {
		return new Id(aString)
	}

	public equals(other: unknown): boolean {
		if (!(other instanceof Id)) return false
		return other._value === this._value
	}
}
