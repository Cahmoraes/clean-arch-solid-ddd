import { OAuth2Client, type TokenPayload } from "google-auth-library"
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
	private readonly googleClientSecret = env.GOOGLE_CLIENT_SECRET
	private readonly googleRedirectUri = env.GOOGLE_REDIRECT_URI

	constructor() {
		this.client = new OAuth2Client({
			clientId: this.googleClientId,
			clientSecret: this.googleClientSecret,
		})
	}

	public async verify(
		authCode: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>> {
		if (!this.hasGoogleCredentials()) {
			return failure(new InvalidGoogleTokenError())
		}
		try {
			const { tokens } = await this.client.getToken({
				code: authCode,
				client_id: this.googleClientId,
				redirect_uri: this.googleRedirectUri,
			})
			if (!tokens.id_token) {
				return failure(new InvalidGoogleTokenError())
			}
			const ticket = await this.client.verifyIdToken({
				idToken: tokens.id_token,
				audience: this.googleClientId,
			})
			return toGoogleUserInfo(ticket.getPayload())
		} catch {
			return failure(new InvalidGoogleTokenError())
		}
	}

	private hasGoogleCredentials(): boolean {
		return Boolean(
			this.googleClientId && this.googleClientSecret && this.googleRedirectUri,
		)
	}
}

function toGoogleUserInfo(
	payload: TokenPayload | undefined,
): Either<InvalidGoogleTokenError, GoogleUserInfo> {
	if (!payload?.sub || !payload.email || !payload.name) {
		return failure(new InvalidGoogleTokenError())
	}

	return success({
		sub: payload.sub,
		email: payload.email,
		name: payload.name,
		emailVerified: payload.email_verified ?? false,
	})
}
