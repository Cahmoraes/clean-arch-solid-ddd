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
	UserActivityPagination,
} from "@/user/application/persistence/dao/user-activity-dao"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface GetUserActivityUseCaseInput {
	userId: string
	page?: number
}

export interface GetUserActivityItemDTO {
	id: string
	type: UserActivityItemType
	description: string
	occurredAt: string
}

export interface GetUserActivityUseCaseOutputDTO {
	events: GetUserActivityItemDTO[]
	pagination: UserActivityPagination
}

export type GetUserActivityUseCaseOutput = Either<
	UserNotFoundError,
	GetUserActivityUseCaseOutputDTO
>

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
		const page = input.page ?? 1
		const pageSize = 20
		const activityPage = await this.userActivityDao.findActivityPage(
			input.userId,
			page,
			pageSize,
		)
		return success({
			events: activityPage.items.map((item) => ({
				id: item.id,
				type: item.type,
				description: item.description,
				occurredAt: item.occurredAt.toISOString(),
			})),
			pagination: activityPage.pagination,
		})
	}
}
