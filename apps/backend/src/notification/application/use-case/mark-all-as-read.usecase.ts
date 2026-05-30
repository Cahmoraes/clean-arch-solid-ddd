import { inject, injectable } from "inversify"

import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { type Either, success } from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface MarkAllAsReadInput {
	userId: string
}

export interface MarkAllAsReadOutput {
	markedCount: number
}

export type MarkAllAsReadResponse = Either<never, MarkAllAsReadOutput>

@injectable()
export class MarkAllAsReadUseCase {
	constructor(
		@inject(NOTIFICATION_TYPES.Repositories.Notification)
		private readonly notificationRepository: NotificationRepository,
	) {}

	public async execute(
		input: MarkAllAsReadInput,
	): Promise<MarkAllAsReadResponse> {
		const { total } = await this.notificationRepository.findManyByUserId({
			userId: input.userId,
			page: 1,
			onlyUnread: true,
		})
		await this.notificationRepository.markAllAsReadByUserId(input.userId)
		return success({ markedCount: total })
	}
}
