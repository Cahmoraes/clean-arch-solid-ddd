import { inject, injectable } from "inversify"

import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { type Either, success } from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface GetUnreadCountInput {
	userId: string
}

export interface GetUnreadCountOutput {
	count: number
}

export type GetUnreadCountResponse = Either<never, GetUnreadCountOutput>

@injectable()
export class GetUnreadCountUseCase {
	constructor(
		@inject(NOTIFICATION_TYPES.Repositories.Notification)
		private readonly notificationRepository: NotificationRepository,
	) {}

	public async execute(
		input: GetUnreadCountInput,
	): Promise<GetUnreadCountResponse> {
		const count = await this.notificationRepository.countUnreadByUserId(
			input.userId,
		)
		return success({ count })
	}
}
