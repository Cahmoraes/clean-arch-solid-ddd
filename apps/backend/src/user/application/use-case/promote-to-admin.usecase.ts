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
import { UserAlreadyAdminError } from "../error/user-already-admin-error"
import { UserIsNotActiveError } from "../error/user-is-not-active-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface PromoteToAdminUseCaseInput {
	requesterId: string
	userId: string
}

export type PromoteToAdminUseCaseOutput = Promise<
	Either<
		| UserNotFoundError
		| UserAlreadyAdminError
		| UserIsNotActiveError
		| UserIsSuperAdminError
		| NotAllowedToManageUserError,
		null
	>
>

@injectable()
export class PromoteToAdminUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: PromoteToAdminUseCaseInput,
	): PromoteToAdminUseCaseOutput {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())

		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		if (user.isSuperAdmin) return failure(new UserIsSuperAdminError())

		if (!UserManagementPolicy.canChangeRole(requester, user)) {
			return failure(new NotAllowedToManageUserError())
		}

		if (!user.isActive) return failure(new UserIsNotActiveError())
		if (user.role === "ADMIN") return failure(new UserAlreadyAdminError())

		user.updateRole("ADMIN")
		await this.userRepository.update(user)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})
		return success(null)
	}
}
