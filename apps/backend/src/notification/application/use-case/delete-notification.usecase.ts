import { inject, injectable } from "inversify"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { NotificationNotFoundError } from "@/notification/domain/errors/notification-not-found-error.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface DeleteNotificationInput {
	notificationId: string
	userId: string
}

export type DeleteNotificationResponse = Either<NotificationNotFoundError, void>

@injectable()
export class DeleteNotificationUseCase {
	constructor(
		@inject(NOTIFICATION_TYPES.Repositories.Notification)
		private readonly notificationRepository: NotificationRepository,
	) {}

	public async execute(
		input: DeleteNotificationInput,
	): Promise<DeleteNotificationResponse> {
		const notification = await this.notificationRepository.findById(
			input.notificationId,
		)
		if (!notification) {
			return failure(new NotificationNotFoundError())
		}
		if (notification.userId !== input.userId || notification.isDeleted) {
			return failure(new NotificationNotFoundError())
		}
		notification.softDelete()
		await this.notificationRepository.save(notification)
		return success(undefined)
	}
}
