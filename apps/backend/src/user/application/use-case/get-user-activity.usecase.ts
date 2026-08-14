import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type {
	UserActivityDao,
	UserActivityItemType,
} from "@/user/application/persistence/dao/user-activity-dao"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface GetUserActivityUseCaseInput {
	userId: string
}

export interface GetUserActivityItemDTO {
	id: string
	type: UserActivityItemType
	description: string
	occurredAt: string
}

export interface GetUserActivityUseCaseOutputDTO {
	events: GetUserActivityItemDTO[]
}

export type GetUserActivityUseCaseOutput = Either<
	UserNotFoundError,
	GetUserActivityUseCaseOutputDTO
>

const ACTIVITY_LIMIT = 20

@injectable()
export class GetUserActivityUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(USER_TYPES.DAO.UserActivity)
		private readonly userActivityDao: UserActivityDao,
	) {}

	public async execute(
		input: GetUserActivityUseCaseInput,
	): Promise<GetUserActivityUseCaseOutput> {
		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		const items = await this.userActivityDao.findRecentActivity(
			input.userId,
			ACTIVITY_LIMIT,
		)
		return success({
			events: items.map((item) => ({
				id: item.id,
				type: item.type,
				description: item.description,
				occurredAt: item.occurredAt.toISOString(),
			})),
		})
	}
}
