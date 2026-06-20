import { createHash, randomBytes } from "node:crypto"
import { inject, injectable } from "inversify"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { env } from "@/shared/infra/env"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { AuthToken } from "@/user/application/auth/auth-token"
import { InvalidCredentialsError } from "@/user/application/error/invalid-credentials-error"
import { PasswordNotSetError } from "@/user/application/error/password-not-set-error"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store"
import type { PasswordResetTokenStore } from "@/user/application/persistence/password-reset-token-store"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { AccountLockedBySecurityEvent } from "@/user/domain/event/account-locked-by-security-event"
import type { User } from "@/user/domain/user"

export interface AuthenticateUseCaseInput {
	email: string
	password: string
}

export interface AuthTokenOutputDTO {
	token: string
	refreshToken: string
}

export type AuthenticateUseCaseOutput = Either<
	InvalidCredentialsError | PasswordNotSetError,
	AuthTokenOutputDTO
>

const MAX_ATTEMPTS = 3
const ATTEMPT_WINDOW_SECONDS = 15 * 60
const RESET_TOKEN_TTL_SECONDS = 15 * 60

@injectable()
export class AuthenticateUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
		@inject(USER_TYPES.Gateways.LoginAttemptStore)
		private readonly loginAttemptStore: LoginAttemptStore,
		@inject(USER_TYPES.Gateways.PasswordResetTokenStore)
		private readonly passwordResetTokenStore: PasswordResetTokenStore,
	) {}

	public async execute(
		input: AuthenticateUseCaseInput,
	): Promise<AuthenticateUseCaseOutput> {
		const user = await this.userRepository.userOfEmail(input.email)
		if (!user) return failure(new InvalidCredentialsError())
		if (!user.password) return failure(new PasswordNotSetError())

		const lockCheckResult = await this.checkLockStatus(user, input.password)
		if (lockCheckResult) return lockCheckResult

		return this.validatePasswordAndAuthenticate(user, input)
	}

	private async checkLockStatus(
		user: User,
		password: string,
	): Promise<AuthenticateUseCaseOutput | null> {
		if (user.isSuperAdmin) return null
		const locked = await this.loginAttemptStore.isLocked(user.id)
		if (!locked) return null
		await user.checkPassword(password)
		return failure(new InvalidCredentialsError())
	}

	private async validatePasswordAndAuthenticate(
		user: User,
		input: AuthenticateUseCaseInput,
	): Promise<AuthenticateUseCaseOutput> {
		const passwordValid = await user.checkPassword(input.password)
		if (!passwordValid) {
			if (!user.isSuperAdmin) {
				await this.handleFailedAttempt(user, input.email)
			}
			return failure(new InvalidCredentialsError())
		}
		if (!user.isSuperAdmin) {
			await this.loginAttemptStore.deleteFailedAttempts(input.email)
		}
		const jwi = this.createJSONWebId()
		return success({
			token: this.signUserToken(user, jwi),
			refreshToken: this.createRefreshToken(user, jwi),
		})
	}

	private async handleFailedAttempt(user: User, email: string): Promise<void> {
		const count = await this.loginAttemptStore.increment(
			email,
			ATTEMPT_WINDOW_SECONDS,
		)

		if (count >= MAX_ATTEMPTS) {
			await this.lockAccount(user, email)
		}
	}

	private async lockAccount(user: User, email: string): Promise<void> {
		user.lock()
		await this.userRepository.update(user)
		await this.loginAttemptStore.setLocked(user.id)
		await this.loginAttemptStore.deleteFailedAttempts(email)

		const rawToken = randomBytes(32).toString("hex")
		const tokenHash = createHash("sha256").update(rawToken).digest("hex")

		const existingHash =
			await this.passwordResetTokenStore.findTokenHashByUserId(user.id)
		if (existingHash) {
			await this.passwordResetTokenStore.deleteResetToken(existingHash)
			await this.passwordResetTokenStore.deleteUidMapping(user.id)
		}

		await this.passwordResetTokenStore.saveResetToken(
			user.id,
			tokenHash,
			RESET_TOKEN_TTL_SECONDS,
		)
		await this.passwordResetTokenStore.saveUidMapping(
			user.id,
			tokenHash,
			RESET_TOKEN_TTL_SECONDS,
		)

		await DomainEventPublisher.instance.publish(
			new AccountLockedBySecurityEvent({
				userId: user.id,
				userEmail: user.email,
				userName: user.name,
				resetToken: rawToken,
			}),
		)
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
