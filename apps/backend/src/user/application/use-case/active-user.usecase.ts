import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface ActiveUserUseCaseInput {
	userId: string
}

export type ActiveUserUseCaseOutput = Promise<Either<UserNotFoundError, null>>

@injectable()
export class ActiveUserUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: ActiveUserUseCaseInput,
	): Promise<ActiveUserUseCaseOutput> {
		const userFound = await this.userRepository.userOfId(input.userId)
		if (!userFound) return failure(new UserNotFoundError())
		userFound.activate()
		await this.userRepository.update(userFound)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		return success(null)
	}
}
