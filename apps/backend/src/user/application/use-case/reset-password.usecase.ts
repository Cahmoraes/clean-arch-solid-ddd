import { createHash } from "node:crypto"
import { inject, injectable } from "inversify"
import type { ValidationError } from "zod-validation-error"
import type { RevokedTokenDAO } from "@/session/application/dao/revoked-token-dao"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import { InvalidResetTokenError } from "../error/invalid-reset-token-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { PasswordResetTokenStore } from "../persistence/password-reset-token-store"
import type { UserRepository } from "../persistence/repository/user-repository"

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60

export interface ResetPasswordUseCaseInput {
	token: string
	newPassword: string
}

export type ResetPasswordUseCaseOutput = Either<
	InvalidResetTokenError | UserNotFoundError | ValidationError,
	null
>

@injectable()
export class ResetPasswordUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(USER_TYPES.Gateways.PasswordResetTokenStore)
		private readonly tokenStore: PasswordResetTokenStore,
		@inject(AUTH_TYPES.DAO.RevokedToken)
		private readonly revokedTokenDAO: RevokedTokenDAO,
	) {
		this.bindMethod()
	}

	private bindMethod(): void {
		this.handlePasswordChangedEvent = this.handlePasswordChangedEvent.bind(this)
	}

	public async execute(
		input: ResetPasswordUseCaseInput,
	): Promise<ResetPasswordUseCaseOutput> {
		const tokenHash = createHash("sha256").update(input.token).digest("hex")
		const userId = await this.tokenStore.findUserIdByTokenHash(tokenHash)
		if (!userId) {
			return failure(new InvalidResetTokenError())
		}

		const user = await this.userRepository.userOfId(userId)
		if (!user) {
			return failure(new UserNotFoundError())
		}

		await this.tokenStore.deleteResetToken(tokenHash)
		await this.tokenStore.deleteUidMapping(userId)

		user.subscribe(this.handlePasswordChangedEvent)
		const changePasswordResult = await user.changePassword(input.newPassword)
		if (changePasswordResult.isFailure()) {
			return failure(changePasswordResult.value)
		}

		await this.userRepository.update(user)
		await this.revokedTokenDAO.revokeAllForUser(userId, SEVEN_DAYS_IN_SECONDS)

		return success(null)
	}

	private handlePasswordChangedEvent(data: PasswordChangedEvent): void {
		void DomainEventPublisher.instance.publish(data)
	}
}
