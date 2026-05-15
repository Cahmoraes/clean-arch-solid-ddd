import { randomUUID } from "node:crypto"
import { inject, injectable } from "inversify"
import { GoogleEmailNotVerifiedError } from "@/session/application/error/google-email-not-verified-error.js"
import type { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import type { GoogleAuthProvider } from "@/session/application/provider/google-auth-provider.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db.js"
import { AUTH_TYPES, SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { ExternalProviderNotLinkedError } from "../error/external-provider-not-linked-error"
import { PasswordAlreadySetError } from "../error/password-already-set-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

const PASSWORD_REAUTH_GRANT_TTL_IN_SECONDS = 300
const PASSWORD_REAUTH_CACHE_PREFIX = "password-reauth"

export interface CreatePasswordReauthGrantUseCaseInput {
	userId: string
	provider: "google"
	idToken: string
}

export interface CreatePasswordReauthGrantUseCaseOutputDTO {
	reauthGrant: string
	expiresInSeconds: number
}

interface PasswordReauthGrantData {
	userId: string
	provider: "google"
}

export type CreatePasswordReauthGrantUseCaseOutput = Either<
	| UserNotFoundError
	| PasswordAlreadySetError
	| ExternalProviderNotLinkedError
	| InvalidGoogleTokenError
	| GoogleEmailNotVerifiedError,
	CreatePasswordReauthGrantUseCaseOutputDTO
>

@injectable()
export class CreatePasswordReauthGrantUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(AUTH_TYPES.Providers.GoogleAuth)
		private readonly googleAuthProvider: GoogleAuthProvider,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: CreatePasswordReauthGrantUseCaseInput,
	): Promise<CreatePasswordReauthGrantUseCaseOutput> {
		const eligibleUserResult = await this.findEligibleUser(input)
		if (eligibleUserResult.isFailure()) {
			return failure(eligibleUserResult.value)
		}

		const user = eligibleUserResult.value
		const googleReauthResult = await this.validateGoogleReauth(
			input,
			user.googleId,
		)
		if (googleReauthResult.isFailure()) {
			return failure(googleReauthResult.value)
		}

		const reauthGrant = randomUUID()
		await this.cacheDB.set<PasswordReauthGrantData>(
			this.createCacheKey(reauthGrant),
			{
				userId: user.id,
				provider: input.provider,
			},
			PASSWORD_REAUTH_GRANT_TTL_IN_SECONDS,
		)

		return success({
			reauthGrant,
			expiresInSeconds: PASSWORD_REAUTH_GRANT_TTL_IN_SECONDS,
		})
	}

	private async findEligibleUser(
		input: Pick<CreatePasswordReauthGrantUseCaseInput, "userId" | "provider">,
	): Promise<
		Either<
			| UserNotFoundError
			| PasswordAlreadySetError
			| ExternalProviderNotLinkedError,
			{ id: string; googleId: string }
		>
	> {
		const userFound = await this.userRepository.userOfId(input.userId)
		if (!userFound) {
			return failure(new UserNotFoundError())
		}

		if (userFound.password) {
			return failure(new PasswordAlreadySetError())
		}

		const googleId = userFound.googleId
		if (
			googleId === undefined ||
			!this.isProviderLinked(googleId, input.provider)
		) {
			return failure(new ExternalProviderNotLinkedError())
		}

		return success({
			id: userFound.id,
			googleId,
		})
	}

	private async validateGoogleReauth(
		input: Pick<CreatePasswordReauthGrantUseCaseInput, "idToken">,
		googleId: string,
	): Promise<
		Either<
			| InvalidGoogleTokenError
			| GoogleEmailNotVerifiedError
			| ExternalProviderNotLinkedError,
			null
		>
	> {
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

		if (googleUserInfo.sub !== googleId) {
			return failure(new ExternalProviderNotLinkedError())
		}

		return success(null)
	}

	private isProviderLinked(
		googleId: string | undefined,
		provider: CreatePasswordReauthGrantUseCaseInput["provider"],
	): boolean {
		if (provider === "google") {
			return Boolean(googleId)
		}

		return false
	}

	private createCacheKey(reauthGrant: string): string {
		return `${PASSWORD_REAUTH_CACHE_PREFIX}:${reauthGrant}`
	}
}
