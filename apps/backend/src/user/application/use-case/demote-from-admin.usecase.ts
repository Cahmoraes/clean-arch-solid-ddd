import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { CannotDemoteSelfError } from "../error/cannot-demote-self-error"
import { UserIsNotAdminError } from "../error/user-is-not-admin-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface DemoteFromAdminUseCaseInput {
	userId: string
	requesterId: string
}

export type DemoteFromAdminUseCaseOutput = Promise<
	Either<
		| UserNotFoundError
		| UserIsNotAdminError
		| UserIsSuperAdminError
		| CannotDemoteSelfError,
		null
	>
>

@injectable()
export class DemoteFromAdminUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: DemoteFromAdminUseCaseInput,
	): DemoteFromAdminUseCaseOutput {
		if (input.userId === input.requesterId) {
			return failure(new CannotDemoteSelfError())
		}

		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		if (user.isSuperAdmin) return failure(new UserIsSuperAdminError())
		if (user.role !== "ADMIN") return failure(new UserIsNotAdminError())

		user.updateRole("MEMBER")
		await this.userRepository.update(user)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		return success(null)
	}
}
