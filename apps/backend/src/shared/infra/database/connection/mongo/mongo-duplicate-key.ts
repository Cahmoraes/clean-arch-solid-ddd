import { MongoServerError } from "mongodb"

const DUPLICATE_KEY_ERROR_CODE = 11000

export function isDuplicateKeyError(error: unknown): error is MongoServerError {
	return (
		error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR_CODE
	)
}

export function duplicateKeyFields(error: MongoServerError): string[] {
	return Object.keys(error.keyPattern ?? {})
}
