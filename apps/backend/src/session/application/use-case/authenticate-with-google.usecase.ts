import { randomBytes } from "node:crypto"
import { inject, injectable } from "inversify"
import { ExternalProviderLinkRequiredError } from "@/session/application/error/external-provider-link-required-error.js"
import { GoogleAccountAlreadyLinkedError } from "@/session/application/error/google-account-already-linked-error.js"
import { GoogleEmailNotVerifiedError } from "@/session/application/error/google-email-not-verified-error.js"
import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import type {
	GoogleAuthProvider,
	GoogleUserInfo,
} from "@/session/application/provider/google-auth-provider.js"
import type { AuthTokenOutputDTO } from "@/session/application/use-case/authenticate.usecase.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { env } from "@/shared/infra/env/index.js"
import { AUTH_TYPES, SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { AuthToken } from "@/user/application/auth/auth-token"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { UserCreatedEvent } from "@/user/domain/event/user-created-event.js"
import { User } from "@/user/domain/user"
import { GoogleId } from "@/user/domain/value-object/google-id.js"

export interface AuthenticateWithGoogleUseCaseInput {
	idToken: string
}

export type AuthenticateWithGoogleUseCaseOutput = Either<
	| InvalidGoogleTokenError
	| GoogleEmailNotVerifiedError
	| GoogleAccountAlreadyLinkedError
	| ExternalProviderLinkRequiredError,
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
		return this.resolveUser(googleUserInfo)
	}

	private async resolveUser(
		googleUserInfo: GoogleUserInfo,
	): Promise<AuthenticateWithGoogleUseCaseOutput> {
		const userByGoogleId = await this.userRepository.userOfGoogleId(
			googleUserInfo.sub,
		)
		if (userByGoogleId) {
			return success(this.createAuthTokenOutput(userByGoogleId))
		}
		return this.resolveByEmail(googleUserInfo)
	}

	private async resolveByEmail(
		googleUserInfo: GoogleUserInfo,
	): Promise<AuthenticateWithGoogleUseCaseOutput> {
		const userByEmail = await this.userRepository.userOfEmail(
			googleUserInfo.email,
		)
		if (userByEmail) {
			if (!userByEmail.googleId) {
				return failure(new ExternalProviderLinkRequiredError())
			}
			return this.linkAndAuthenticate(userByEmail, googleUserInfo.sub)
		}
		return this.createAndAuthenticate(googleUserInfo)
	}

	private async linkAndAuthenticate(
		user: User,
		googleSub: string,
	): Promise<AuthenticateWithGoogleUseCaseOutput> {
		if (user.googleId && user.googleId !== googleSub) {
			return failure(new GoogleAccountAlreadyLinkedError())
		}
		user.linkGoogleAccount(GoogleId.restore(googleSub))
		await this.userRepository.update(user)
		return success(this.createAuthTokenOutput(user))
	}

	private async createAndAuthenticate(
		googleUserInfo: GoogleUserInfo,
	): Promise<AuthenticateWithGoogleUseCaseOutput> {
		const createdUserResult = await User.create({
			name: googleUserInfo.name,
			email: googleUserInfo.email,
			googleId: googleUserInfo.sub,
		})
		if (createdUserResult.isFailure()) {
			return failure(new InvalidGoogleTokenError())
		}
		try {
			await this.userRepository.save(createdUserResult.value)
		} catch {
			// Race condition: concurrent request created the user first.
			// Recover by fetching the already-persisted user.
			const existing = await this.userRepository.userOfGoogleId(
				googleUserInfo.sub,
			)
			if (existing) {
				return success(this.createAuthTokenOutput(existing))
			}
			throw new Error("Failed to persist Google user account")
		}
		await this.publishUserCreatedEvent(createdUserResult.value)
		return success(this.createAuthTokenOutput(createdUserResult.value))
	}

	private async publishUserCreatedEvent(user: User): Promise<void> {
		const event = new UserCreatedEvent({
			email: user.email,
			name: user.name,
		})
		await DomainEventPublisher.instance.publish(event)
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
					isSuperAdmin: user.isSuperAdmin,
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
					isSuperAdmin: user.isSuperAdmin,
					jwi,
				},
			},
			env.PRIVATE_KEY,
		)
	}
}
