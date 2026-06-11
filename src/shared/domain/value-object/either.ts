export class Failure<L, R> {
	constructor(readonly value: L) {}

	get force() {
		const _self = this
		return {
			success() {
				throw new Error("Cannot call success on failure")
			},
			failure() {
				return {
					get value() {
						return _self.value
					},
				}
			},
		}
	}

	public forceFailure() {
		const _self = this
		return {
			get value() {
				return _self.value
			},
		}
	}

	public forceSuccess() {
		return {
			get value(): never {
				throw new Error("Cannot call success on failure")
			},
		}
	}

	public isFailure(): this is Failure<L, R> {
		return true
	}

	public isSuccess(): this is Success<L, R> {
		return false
	}
}

export class Success<L, R> {
	constructor(readonly value: R) {}

	get force() {
		const _self = this
		return {
			success() {
				return {
					get value() {
						return _self.value
					},
				}
			},
			failure() {
				throw new Error("Cannot call failure on success")
			},
		}
	}

	public forceFailure() {
		return {
			get value(): never {
				throw new Error("Cannot call failure on success")
			},
		}
	}

	public forceSuccess() {
		const _self = this
		return {
			get value() {
				return _self.value
			},
		}
	}

	public isFailure(): this is Failure<L, R> {
		return false
	}

	public isSuccess(): this is Success<L, R> {
		return true
	}
}

export type Either<L, R> = Failure<L, R> | Success<L, R>

export function failure<L, R>(value: L): Either<L, R> {
	return new Failure<L, R>(value)
}

export function success<L, R>(value: R): Either<L, R> {
	return new Success<L, R>(value)
}
