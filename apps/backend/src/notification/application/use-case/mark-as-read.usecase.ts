import { inject, injectable } from "inversify"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { NotificationNotFoundError } from "@/notification/domain/errors/notification-not-found-error.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface MarkAsReadInput {
	notificationId: string
	userId: string
}

export interface MarkAsReadOutput {
	readAt: Date
}

export type MarkAsReadResponse = Either<
	NotificationNotFoundError,
	MarkAsReadOutput
>

@injectable()
export class MarkAsReadUseCase {
	constructor(
		@inject(NOTIFICATION_TYPES.Repositories.Notification)
		private readonly notificationRepository: NotificationRepository,
	) {}

	public async execute(input: MarkAsReadInput): Promise<MarkAsReadResponse> {
		const notification = await this.notificationRepository.findById(
			input.notificationId,
		)
		if (!notification) return failure(new NotificationNotFoundError())
		if (notification.userId !== input.userId) {
			return failure(new NotificationNotFoundError())
		}
		notification.markAsRead()
		await this.notificationRepository.save(notification)
		return success({ readAt: notification.readAt ?? new Date() })
	}
}
