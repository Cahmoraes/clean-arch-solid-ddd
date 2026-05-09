import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"

export class InvalidGoogleIdError extends Error {
	constructor() {
		super("Google ID cannot be empty")
		this.name = "InvalidGoogleIdError"
	}
}

export class GoogleId {
	private constructor(private readonly _value: string) {}

	public static create(
		aString: string,
	): Either<InvalidGoogleIdError, GoogleId> {
		if (!aString || aString.trim().length === 0) {
			return failure(new InvalidGoogleIdError())
		}

		return success(new GoogleId(aString))
	}

	public static restore(aString: string): GoogleId {
		return new GoogleId(aString)
	}

	get value(): string {
		return this._value
	}
}
