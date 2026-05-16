import { inject, injectable } from "inversify"
import type { ValidationError } from "zod-validation-error"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db.js"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { Queue } from "@/shared/infra/queue/queue"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import type { User } from "@/user/domain/user"
import { ExternalProviderNotLinkedError } from "../error/external-provider-not-linked-error"
import { PasswordAlreadySetError } from "../error/password-already-set-error"
import { ReauthGrantInvalidError } from "../error/reauth-grant-invalid-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

const PASSWORD_REAUTH_CACHE_PREFIX = "password-reauth"

export interface DefinePasswordUseCaseInput {
	userId: string
	provider: "google"
	reauthGrant: string
	newRawPassword: string
}

interface PasswordReauthGrantData {
	userId: string
	provider: "google"
}

export type DefinePasswordUseCaseOutput = Either<
	| UserNotFoundError
	| PasswordAlreadySetError
	| ExternalProviderNotLinkedError
	| ReauthGrantInvalidError
	| ValidationError,
	null
>

@injectable()
export class DefinePasswordUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
	) {
		this.bindMethod()
	}

	private bindMethod(): void {
		this.handlePasswordChangedEvent = this.handlePasswordChangedEvent.bind(this)
	}

	public async execute(
		input: DefinePasswordUseCaseInput,
	): Promise<DefinePasswordUseCaseOutput> {
		const eligibleUserResult = await this.findEligibleUser(input)
		if (eligibleUserResult.isFailure()) {
			return failure(eligibleUserResult.value)
		}
		const grantResult = await this.consumeGrant(input)
		if (grantResult.isFailure()) {
			return failure(grantResult.value)
		}
		const user = eligibleUserResult.value
		user.subscribe(this.handlePasswordChangedEvent)
		const changePasswordResult = await user.changePassword(input.newRawPassword)
		if (changePasswordResult.isFailure()) {
			return failure(changePasswordResult.value)
		}
		await this.userRepository.update(user)
		return success(null)
	}

	private async findEligibleUser(
		input: Pick<DefinePasswordUseCaseInput, "userId" | "provider">,
	): Promise<
		Either<
			| UserNotFoundError
			| PasswordAlreadySetError
			| ExternalProviderNotLinkedError,
			User
		>
	> {
		const userFound = await this.userRepository.userOfId(input.userId)
		if (!userFound) {
			return failure(new UserNotFoundError())
		}
		if (userFound.password) {
			return failure(new PasswordAlreadySetError())
		}
		if (!this.isProviderLinked(userFound.googleId, input.provider)) {
			return failure(new ExternalProviderNotLinkedError())
		}
		return success(userFound)
	}

	private async consumeGrant(
		input: Pick<
			DefinePasswordUseCaseInput,
			"userId" | "provider" | "reauthGrant"
		>,
	): Promise<Either<ReauthGrantInvalidError, null>> {
		const grantData = await this.cacheDB.getAndDelete<PasswordReauthGrantData>(
			this.createCacheKey(input.reauthGrant),
		)
		if (!grantData || !this.matchesGrant(grantData, input)) {
			return failure(new ReauthGrantInvalidError())
		}
		return success(null)
	}

	private isProviderLinked(
		googleId: string | undefined,
		provider: DefinePasswordUseCaseInput["provider"],
	): boolean {
		if (provider === "google") {
			return Boolean(googleId)
		}
		return false
	}

	private matchesGrant(
		grantData: PasswordReauthGrantData,
		input: Pick<DefinePasswordUseCaseInput, "userId" | "provider">,
	): boolean {
		return (
			grantData.userId === input.userId && grantData.provider === input.provider
		)
	}

	private createCacheKey(reauthGrant: string): string {
		return `${PASSWORD_REAUTH_CACHE_PREFIX}:${reauthGrant}`
	}

	private handlePasswordChangedEvent(data: PasswordChangedEvent): void {
		const event = new PasswordChangedEvent({
			userEmail: data.payload.userEmail,
			userName: data.payload.userName,
		})
		void DomainEventPublisher.instance.publish(event)
		this.queue.publish(event.eventName, event)
	}
}
