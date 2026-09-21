import { inject, injectable } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
import { Notification } from "@/notification/domain/notification.js"
import { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { Logger } from "@/shared/infra/logger/logger.js"
import { EXCHANGES } from "@/shared/infra/queue/exchanges.js"
import type { Queue } from "@/shared/infra/queue/queue.js"
import type { NotificationCreatedPayload } from "../event-handler/create-notification-on-check-in-event.handler.js"

export const BROADCAST_CHUNK_SIZE = 500
export const NOTICE_TITLE_MAX = 100
export const NOTICE_MESSAGE_MAX = 500

export interface BroadcastNoticeInput {
	title: string
	message: string
}

export interface BroadcastNoticeOutput {
	recipients: number
}

export type BroadcastNoticeResponse = Either<
	InvalidNoticeError,
	BroadcastNoticeOutput
>

@injectable()
export class BroadcastNoticeUseCase {
	constructor(
		@inject(NOTIFICATION_TYPES.Repositories.Notification)
		private readonly notificationRepository: NotificationRepository,
		@inject(NOTIFICATION_TYPES.Providers.ActiveRecipients)
		private readonly activeRecipientsProvider: ActiveRecipientsProvider,
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
	) {}

	public async execute(
		input: BroadcastNoticeInput,
	): Promise<BroadcastNoticeResponse> {
		const title = input.title.trim()
		const message = input.message.trim()
		const invalid = this.validate(title, message)
		if (invalid) return failure(invalid)
		const userIds = await this.activeRecipientsProvider.listActiveUserIds(
			NoticeAudience.all(),
		)
		for (const block of this.toBlocks(userIds)) {
			const notifications = block.map((userId) =>
				Notification.create({ userId, type: "NOTICE", title, message }),
			)
			await this.notificationRepository.saveMany(notifications)
			await this.publishAll(notifications)
		}
		return success({ recipients: userIds.length })
	}

	private validate(title: string, message: string): InvalidNoticeError | null {
		if (title.length < 1 || title.length > NOTICE_TITLE_MAX) {
			return new InvalidNoticeError(
				`Title must have between 1 and ${NOTICE_TITLE_MAX} characters`,
			)
		}
		if (message.length < 1 || message.length > NOTICE_MESSAGE_MAX) {
			return new InvalidNoticeError(
				`Message must have between 1 and ${NOTICE_MESSAGE_MAX} characters`,
			)
		}
		return null
	}

	private toBlocks(userIds: string[]): string[][] {
		const blocks: string[][] = []
		for (let start = 0; start < userIds.length; start += BROADCAST_CHUNK_SIZE) {
			blocks.push(userIds.slice(start, start + BROADCAST_CHUNK_SIZE))
		}
		return blocks
	}

	private async publishAll(notifications: Notification[]): Promise<void> {
		const outcomes = await Promise.allSettled(
			notifications.map((notification) => this.publish(notification)),
		)
		for (const outcome of outcomes) {
			if (outcome.status === "rejected") {
				this.logger.error(
					this,
					`Falha ao publicar aviso em ${EXCHANGES.NOTIFICATION_CREATED}: ${String(outcome.reason)}`,
				)
			}
		}
	}

	private publish(notification: Notification): Promise<void> {
		return this.queue.publish<NotificationCreatedPayload>(
			EXCHANGES.NOTIFICATION_CREATED,
			{
				notificationId: notification.id,
				userId: notification.userId,
				type: notification.type,
				title: notification.title,
				message: notification.message,
			},
		)
	}
}
