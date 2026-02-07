import type { Either } from "./value-object/either"

export class Result<Type> {
	private readonly _errors: Error[]

	private constructor(aValue?: Type | null)
	private constructor(aValue?: Type | null, errors?: Error[])
	private constructor(_aValue: Type | null, errors?: Error[]) {
		this._errors = errors ?? []
	}

	public static try<T extends Either<Error, any>>(eitherType: T) {
		return eitherType.isSuccess()
			? Result.ok(eitherType.value)
			: Result.fail(eitherType.value)
	}

	public static combine(results: Either<Error, any>[]): Result<any> {
		const errors = results
			.filter((error) => error.isFailure())
			.map((error) => error.value)
		const hasErrors = errors.length > 0
		return hasErrors ? Result.fail(errors) : Result.ok(null)
	}

	private static ok<Type>(aValue: Type): Result<Type> {
		return new Result(aValue)
	}

	private static fail<ErrorType extends Error>(
		aValue: ErrorType | ErrorType[],
	): Result<null> {
		const errors = Array.isArray(aValue) ? aValue : [aValue]
		return new Result(null, errors)
	}

	public get isValid(): boolean {
		return this._errors.length === 0
	}

	public get errors(): Error[] {
		return this._errors
	}
}
