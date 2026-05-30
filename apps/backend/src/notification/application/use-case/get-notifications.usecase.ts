import { inject, injectable } from "inversify"

import type {
	FindManyNotificationsOutput,
	NotificationRepository,
} from "@/notification/application/repository/notification.repository.js"
import { type Either, success } from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface GetNotificationsInput {
	userId: string
	page: number
	onlyUnread?: boolean
}

export type GetNotificationsOutput = FindManyNotificationsOutput

export type GetNotificationsResponse = Either<never, GetNotificationsOutput>

@injectable()
export class GetNotificationsUseCase {
	constructor(
		@inject(NOTIFICATION_TYPES.Repositories.Notification)
		private readonly notificationRepository: NotificationRepository,
	) {}

	public async execute(
		input: GetNotificationsInput,
	): Promise<GetNotificationsResponse> {
		const result = await this.notificationRepository.findManyByUserId({
			userId: input.userId,
			page: input.page,
			onlyUnread: input.onlyUnread,
		})
		return success(result)
	}
}
