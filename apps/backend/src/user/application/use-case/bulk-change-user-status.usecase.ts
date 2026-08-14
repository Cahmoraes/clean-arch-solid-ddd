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
import type { StatusTypes } from "@/user/domain/value-object/status"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface BulkChangeUserStatusUseCaseInput {
	requesterId: string
	userIds: string[]
	targetStatus: StatusTypes
}

export interface BulkChangeUserStatusResult {
	updated: number
	requested: number
	skipped: number
}

export type BulkChangeUserStatusUseCaseOutput = Promise<
	Either<NotAllowedToManageUserError, BulkChangeUserStatusResult>
>

@injectable()
export class BulkChangeUserStatusUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: BulkChangeUserStatusUseCaseInput,
	): BulkChangeUserStatusUseCaseOutput {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())

		const uniqueUserIds = Array.from(new Set(input.userIds))
		const candidates = await this.userRepository.usersOfIds(uniqueUserIds)

		const eligibleIds = candidates
			.filter((candidate) =>
				UserManagementPolicy.canChangeStatus(requester, candidate),
			)
			.map((candidate) => candidate.id)

		// Snapshot dos dados ANTES do update: `candidates` referencia as mesmas
		// instâncias de User mantidas pelo repositório, então após
		// updateManyStatus() o `status` já estaria mutado in-place — capturar
		// previousStatus aqui evita ler o status novo por engano.
		const changedCandidateSnapshots = candidates
			.filter(
				(candidate) =>
					eligibleIds.includes(candidate.id) &&
					candidate.status !== input.targetStatus,
			)
			.map((candidate) => ({
				userId: candidate.id,
				userEmail: candidate.email,
				userName: candidate.name,
				previousStatus: candidate.status,
			}))

		const updated = await this.userRepository.updateManyStatus(
			eligibleIds,
			input.targetStatus,
		)

		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})

		await Promise.all(
			changedCandidateSnapshots.map((snapshot) =>
				DomainEventPublisher.instance.publish(
					new UserStatusChangedEvent({
						userId: snapshot.userId,
						userEmail: snapshot.userEmail,
						userName: snapshot.userName,
						previousStatus: snapshot.previousStatus,
						newStatus: input.targetStatus,
					}),
				),
			),
		)

		const requested = uniqueUserIds.length
		return success({ updated, requested, skipped: requested - updated })
	}
}
