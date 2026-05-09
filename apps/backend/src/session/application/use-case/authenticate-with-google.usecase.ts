import { randomBytes } from "node:crypto"

import { inject, injectable } from "inversify"

import { GoogleEmailNotVerifiedError } from "@/session/application/error/google-email-not-verified-error.js"
import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import type { GoogleAuthProvider } from "@/session/application/provider/google-auth-provider.js"
import type { AuthTokenOutputDTO } from "@/session/application/use-case/authenticate.usecase.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { env } from "@/shared/infra/env/index.js"
import { AUTH_TYPES, SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { AuthToken } from "@/user/application/auth/auth-token"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { User } from "@/user/domain/user"
import { GoogleId } from "@/user/domain/value-object/google-id.js"

export interface AuthenticateWithGoogleUseCaseInput {
	idToken: string
}

export type AuthenticateWithGoogleUseCaseOutput = Either<
	InvalidGoogleTokenError | GoogleEmailNotVerifiedError,
	AuthTokenOutputDTO
>

@injectable()
export class AuthenticateWithGoogleUseCase {
	constructor(
		@inject(AUTH_TYPES.Providers.GoogleAuth)
		private readonly googleAuthProvider: GoogleAuthProvider,
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
	) {}

	public async execute(
		input: AuthenticateWithGoogleUseCaseInput,
	): Promise<AuthenticateWithGoogleUseCaseOutput> {
		const googleUserInfoResult = await this.googleAuthProvider.verify(
			input.idToken,
		)
		if (googleUserInfoResult.isFailure()) {
			return failure(googleUserInfoResult.value)
		}

		const googleUserInfo = googleUserInfoResult.value
		if (!googleUserInfo.emailVerified) {
			return failure(new GoogleEmailNotVerifiedError())
		}

		const userByGoogleId = await this.userRepository.userOfGoogleId(
			googleUserInfo.sub,
		)
		if (userByGoogleId) {
			return success(this.createAuthTokenOutput(userByGoogleId))
		}

		const userByEmail = await this.userRepository.userOfEmail(
			googleUserInfo.email,
		)
		if (userByEmail) {
			userByEmail.linkGoogleAccount(GoogleId.restore(googleUserInfo.sub))
			await this.userRepository.update(userByEmail)
			return success(this.createAuthTokenOutput(userByEmail))
		}

		const createdUserResult = await User.create({
			name: googleUserInfo.name,
			email: googleUserInfo.email,
			googleId: googleUserInfo.sub,
		})
		if (createdUserResult.isFailure()) {
			return failure(new InvalidGoogleTokenError())
		}

		await this.userRepository.save(createdUserResult.value)
		return success(this.createAuthTokenOutput(createdUserResult.value))
	}

	private createAuthTokenOutput(user: User): AuthTokenOutputDTO {
		const jwi = this.createJSONWebId()

		return {
			token: this.signUserToken(user, jwi),
			refreshToken: this.createRefreshToken(user, jwi),
		}
	}

	private createJSONWebId(): string {
		return randomBytes(16).toString("hex")
	}

	private signUserToken(user: User, jwi: string): string {
		return this.authToken.sign(
			{
				sub: {
					id: user.id,
					email: user.email,
					role: user.role,
					jwi,
				},
			},
			env.PRIVATE_KEY,
		)
	}

	private createRefreshToken(user: User, jwi: string): string {
		return this.authToken.refreshToken(
			{
				sub: {
					id: user.id,
					email: user.email,
					role: user.role,
					jwi,
				},
			},
			env.PRIVATE_KEY,
		)
	}
}
