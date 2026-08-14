import { inject, injectable } from "inversify"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface SuspendUserUseCaseInput {
	requesterId: string
	userId: string
}

export type SuspendUserUseCaseOutput = Promise<
	Either<UserNotFoundError | NotAllowedToManageUserError, null>
>

@injectable()
export class SuspendUserUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: SuspendUserUseCaseInput,
	): SuspendUserUseCaseOutput {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())

		const userFound = await this.userRepository.userOfId(input.userId)
		if (!userFound) return failure(new UserNotFoundError())

		if (!UserManagementPolicy.canChangeStatus(requester, userFound)) {
			return failure(new NotAllowedToManageUserError())
		}

		const previousStatus = userFound.status
		userFound.suspend()
		await this.userRepository.update(userFound)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})

		// Skip event publication if user was already suspended (no state change)
		if (previousStatus !== "suspended") {
			await DomainEventPublisher.instance.publish(
				new UserStatusChangedEvent({
					userId: userFound.id,
					userEmail: userFound.email,
					userName: userFound.name,
					previousStatus,
					newStatus: "suspended",
				}),
			)
		}

		return success(null)
	}
}
