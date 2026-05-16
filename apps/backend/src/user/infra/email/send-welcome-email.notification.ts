import { render } from "@react-email/render"
import { inject, injectable } from "inversify"
import { createElement } from "react"

import type { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { UserCreatedEvent } from "@/user/domain/event/user-created-event.js"

import { WelcomeEmailTemplate } from "./templates/welcome-email.template.js"

@injectable()
export class SendWelcomeEmailNotification {
	private readonly boundHandle: (event: DomainEvent<unknown>) => Promise<void>

	constructor(
		@inject(SHARED_TYPES.Mailer)
		private readonly mailer: MailerGateway,
	) {
		this.boundHandle = this.handle.bind(this)
	}

	subscribe(): void {
		DomainEventPublisher.instance.subscribe(
			EVENTS.USER_CREATED,
			this.boundHandle,
		)
	}

	unsubscribe(): void {
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.USER_CREATED,
			this.boundHandle,
		)
	}

	private async handle(event: DomainEvent<unknown>): Promise<void> {
		if (!(event instanceof UserCreatedEvent)) return

		try {
			const html = await render(
				createElement(WelcomeEmailTemplate, {
					email: event.payload.email,
					name: event.payload.name,
				}),
			)

			await this.mailer.sendMail({
				to: event.payload.email,
				subject: "Bem-vindo(a) à plataforma!",
				html,
			})
		} catch (error) {
			console.error("[SendWelcomeEmailNotification]", error)
		}
	}
}
