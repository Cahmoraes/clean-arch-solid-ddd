import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { CannotDeleteSelfError } from "../error/cannot-delete-self-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface DeleteUserUseCaseInput {
	userId: string
	requesterId: string
}

export type DeleteUserUseCaseOutput = Either<
	CannotDeleteSelfError | UserNotFoundError | UserIsSuperAdminError,
	null
>

@injectable()
export class DeleteUserUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: DeleteUserUseCaseInput,
	): Promise<DeleteUserUseCaseOutput> {
		if (input.userId === input.requesterId) {
			return failure(new CannotDeleteSelfError())
		}
		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		if (user.isSuperAdmin) return failure(new UserIsSuperAdminError())
		user.delete()
		await this.userRepository.update(user)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})
		return success(null)
	}
}
