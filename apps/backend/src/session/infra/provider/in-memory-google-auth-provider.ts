import { injectable } from "inversify"
import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import type {
	GoogleAuthProvider,
	GoogleUserInfo,
} from "@/session/application/provider/google-auth-provider.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"

@injectable()
export class InMemoryGoogleAuthProvider implements GoogleAuthProvider {
	private readonly validTokens = new Map<string, GoogleUserInfo>()

	public addValidToken(idToken: string, userInfo: GoogleUserInfo): void {
		this.validTokens.set(idToken, userInfo)
	}

	public async verify(
		idToken: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>> {
		const userInfo = this.validTokens.get(idToken)

		if (!userInfo) {
			return failure(new InvalidGoogleTokenError())
		}

		return success(userInfo)
	}
}
