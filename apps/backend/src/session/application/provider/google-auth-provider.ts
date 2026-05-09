import type { Either } from "@/shared/domain/value-object/either.js"

import type { InvalidGoogleTokenError } from "../error/invalid-google-token-error.js"

export interface GoogleUserInfo {
	sub: string
	email: string
	name: string
	emailVerified: boolean
}

export interface GoogleAuthProvider {
	verify(
		idToken: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>>
}
