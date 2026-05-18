import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { UserAlreadyAdminError } from "../error/user-already-admin-error"
import { UserIsNotActiveError } from "../error/user-is-not-active-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

const SUPER_ADMIN_EMAIL = "admin@admin.com"

export interface PromoteToAdminUseCaseInput {
	userId: string
}

export type PromoteToAdminUseCaseOutput = Promise<
	Either<
		| UserNotFoundError
		| UserAlreadyAdminError
		| UserIsNotActiveError
		| UserIsSuperAdminError,
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
		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		if (user.email === SUPER_ADMIN_EMAIL)
			return failure(new UserIsSuperAdminError())
		if (!user.isActive) return failure(new UserIsNotActiveError())
		if (user.role === "ADMIN") return failure(new UserAlreadyAdminError())

		user.updateRole("ADMIN")
		await this.userRepository.update(user)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		return success(null)
	}
}
