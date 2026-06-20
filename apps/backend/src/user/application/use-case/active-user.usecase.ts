import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { LoginAttemptStore } from "../persistence/login-attempt-store"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface ActiveUserUseCaseInput {
	requesterId: string
	userId: string
}

export type ActiveUserUseCaseOutput = Promise<
	Either<UserNotFoundError | NotAllowedToManageUserError, null>
>

@injectable()
export class ActiveUserUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
		@inject(USER_TYPES.Gateways.LoginAttemptStore)
		private readonly loginAttemptStore: LoginAttemptStore,
	) {}

	public async execute(input: ActiveUserUseCaseInput): ActiveUserUseCaseOutput {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())

		const userFound = await this.userRepository.userOfId(input.userId)
		if (!userFound) return failure(new UserNotFoundError())

		if (!UserManagementPolicy.canChangeStatus(requester, userFound)) {
			return failure(new NotAllowedToManageUserError())
		}

		userFound.activate()
		await this.userRepository.update(userFound)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})
		this.loginAttemptStore.deleteLock(userFound.id).catch((err) => {
			console.error("[ActiveUserUseCase] Falha ao limpar Redis lock:", err)
		})
		return success(null)
	}
}
