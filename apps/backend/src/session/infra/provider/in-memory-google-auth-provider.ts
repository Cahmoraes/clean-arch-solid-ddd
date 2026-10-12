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
	private readonly validCodes = new Map<string, GoogleUserInfo>()

	public addValidCode(code: string, userInfo: GoogleUserInfo): void {
		this.validCodes.set(code, userInfo)
	}

	public async verify(
		code: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>> {
		const userInfo = this.validCodes.get(code)

		if (!userInfo) {
			return failure(new InvalidGoogleTokenError())
		}

		return success(userInfo)
	}
}
