import { OAuth2Client } from "google-auth-library"
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
import { env } from "@/shared/infra/env/index.js"

@injectable()
export class GoogleAuthProviderImpl implements GoogleAuthProvider {
	private readonly client: OAuth2Client
	private readonly googleClientId = env.GOOGLE_CLIENT_ID

	constructor() {
		this.client = new OAuth2Client(this.googleClientId)
	}

	public async verify(
		idToken: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>> {
		if (!this.googleClientId) {
			return failure(new InvalidGoogleTokenError())
		}
		try {
			const ticket = await this.client.verifyIdToken({
				idToken,
				audience: this.googleClientId,
			})
			const payload = ticket.getPayload()
			if (!payload?.sub || !payload.email || !payload.name) {
				return failure(new InvalidGoogleTokenError())
			}
			return success({
				sub: payload.sub,
				email: payload.email,
				name: payload.name,
				emailVerified: payload.email_verified ?? false,
			})
		} catch {
			return failure(new InvalidGoogleTokenError())
		}
	}
}
