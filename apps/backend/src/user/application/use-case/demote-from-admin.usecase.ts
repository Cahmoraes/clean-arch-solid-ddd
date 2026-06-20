import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import type { User } from "@/user/domain/user"
import { CannotDemoteSelfError } from "../error/cannot-demote-self-error"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserIsNotAdminError } from "../error/user-is-not-admin-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface DemoteFromAdminUseCaseInput {
	userId: string
	requesterId: string
}

export type DemoteFromAdminUseCaseOutput = Promise<
	Either<
		| UserNotFoundError
		| UserIsNotAdminError
		| UserIsSuperAdminError
		| CannotDemoteSelfError
		| NotAllowedToManageUserError,
		null
	>
>

type AuthorizeResult = Either<
	NotAllowedToManageUserError | UserNotFoundError | UserIsSuperAdminError,
	{ requester: User; user: User }
>

@injectable()
export class DemoteFromAdminUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	private async authorizeRoleChange(
		requesterId: string,
		userId: string,
	): Promise<AuthorizeResult> {
		const requester = await this.userRepository.userOfId(requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())
		const user = await this.userRepository.userOfId(userId)
		if (!user) return failure(new UserNotFoundError())
		if (user.isSuperAdmin) return failure(new UserIsSuperAdminError())
		if (!UserManagementPolicy.canChangeRole(requester, user)) {
			return failure(new NotAllowedToManageUserError())
		}
		return success({ requester, user })
	}

	public async execute(
		input: DemoteFromAdminUseCaseInput,
	): DemoteFromAdminUseCaseOutput {
		if (input.userId === input.requesterId) {
			return failure(new CannotDemoteSelfError())
		}

		const authResult = await this.authorizeRoleChange(
			input.requesterId,
			input.userId,
		)
		if (authResult.isFailure()) return failure(authResult.value)

		const { user } = authResult.value
		if (user.role !== "ADMIN") return failure(new UserIsNotAdminError())
		user.updateRole("MEMBER")
		await this.userRepository.update(user)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})
		return success(null)
	}
}
