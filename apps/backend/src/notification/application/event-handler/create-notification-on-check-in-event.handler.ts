import { inject, injectable } from "inversify"

import { CheckInApprovedEvent } from "@/check-in/domain/event/check-in-approved-event.js"
import { CheckInRejectedEvent } from "@/check-in/domain/event/check-in-rejected-event.js"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { Notification } from "@/notification/domain/notification.js"
import type { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { EXCHANGES } from "@/shared/infra/queue/exchanges.js"
import type { Queue } from "@/shared/infra/queue/queue.js"

export interface NotificationCreatedPayload {
	notificationId: string
	userId: string
	type: string
	title: string
	message: string
}

@injectable()
export class CreateNotificationOnCheckInEventHandler {
	private readonly boundHandleApproved: (
		event: DomainEvent<unknown>,
	) => Promise<void>

	private readonly boundHandleRejected: (
		event: DomainEvent<unknown>,
	) => Promise<void>

	constructor(
		@inject(NOTIFICATION_TYPES.Repositories.Notification)
		private readonly notificationRepository: NotificationRepository,
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
	) {
		this.boundHandleApproved = this.handleApproved.bind(this)
		this.boundHandleRejected = this.handleRejected.bind(this)
	}

	public subscribe(): void {
		DomainEventPublisher.instance.subscribe(
			EVENTS.CHECK_IN_APPROVED,
			this.boundHandleApproved,
		)
		DomainEventPublisher.instance.subscribe(
			EVENTS.CHECK_IN_REJECTED,
			this.boundHandleRejected,
		)
	}

	public unsubscribe(): void {
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.CHECK_IN_APPROVED,
			this.boundHandleApproved,
		)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.CHECK_IN_REJECTED,
			this.boundHandleRejected,
		)
	}

	private async handleApproved(event: DomainEvent<unknown>): Promise<void> {
		if (!(event instanceof CheckInApprovedEvent)) return

		const notification = Notification.create({
			userId: event.payload.userId,
			type: "CHECK_IN_APPROVED",
			title: "Check-in aprovado",
			message: "Seu check-in foi aprovado com sucesso.",
		})

		await this.persistAndPublish(notification)
	}

	private async handleRejected(event: DomainEvent<unknown>): Promise<void> {
		if (!(event instanceof CheckInRejectedEvent)) return

		const notification = Notification.create({
			userId: event.payload.userId,
			type: "CHECK_IN_REJECTED",
			title: "Check-in rejeitado",
			message: "Seu check-in foi rejeitado.",
		})

		await this.persistAndPublish(notification)
	}

	private async persistAndPublish(notification: Notification): Promise<void> {
		await this.notificationRepository.save(notification)
		await this.queue.publish<NotificationCreatedPayload>(
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
