import { InvalidIdError } from "../error/invalid-id-error"
import { type Either, failure, success } from "./either"

export class ExistingId {
	private constructor(private readonly _value: string) {}

	get value(): string {
		return this._value
	}

	public static create(aString: string): Either<InvalidIdError, ExistingId> {
		if (!this.validateUUID(aString)) {
			return failure(new InvalidIdError())
		}
		return success(new ExistingId(aString))
	}

	private static validateUUID(aString: string): boolean {
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		return uuidRegex.test(aString)
	}

	public static restore(aString: string): ExistingId {
		return new ExistingId(aString)
	}

	public equals(other: unknown): boolean {
		if (!(other instanceof ExistingId)) return false
		return other._value === this._value
	}
}
