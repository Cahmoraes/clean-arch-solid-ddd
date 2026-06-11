import { render } from "@react-email/render"
import { inject, injectable } from "inversify"
import { createElement } from "react"
import type { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event.js"
import { PasswordAlertEmailTemplate } from "./templates/password-alert-email.template.js"

@injectable()
export class SendPasswordAlertEmailNotification {
	private readonly boundHandle: (event: DomainEvent<unknown>) => Promise<void>

	constructor(
		@inject(SHARED_TYPES.Mailer)
		private readonly mailer: MailerGateway,
	) {
		this.boundHandle = this.handle.bind(this)
	}

	public subscribe(): void {
		DomainEventPublisher.instance.subscribe(
			EVENTS.PASSWORD_CHANGED,
			this.boundHandle,
		)
	}

	public unsubscribe(): void {
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.PASSWORD_CHANGED,
			this.boundHandle,
		)
	}

	private async handle(event: DomainEvent<unknown>): Promise<void> {
		if (!(event instanceof PasswordChangedEvent)) return
		try {
			const html = await render(
				createElement(PasswordAlertEmailTemplate, {
					email: event.payload.userEmail,
					name: event.payload.userName,
				}),
			)
			await this.mailer.sendMail({
				to: event.payload.userEmail,
				subject: "Aviso de segurança: senha definida na sua conta",
				html,
			})
		} catch (error) {
			console.error("[SendPasswordAlertEmailNotification]", error)
		}
	}
}
