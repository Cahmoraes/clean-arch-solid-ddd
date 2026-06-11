import { render } from "@react-email/render"
import { inject, injectable } from "inversify"
import { createElement } from "react"

import type { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import { env } from "@/shared/infra/env/index.js"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { PasswordResetRequestedEvent } from "@/user/domain/event/password-reset-requested-event.js"

import { PasswordResetEmailTemplate } from "./templates/password-reset-email.template.js"

@injectable()
export class SendPasswordResetEmailNotification {
	private readonly boundHandle: (event: DomainEvent<unknown>) => Promise<void>

	constructor(
		@inject(SHARED_TYPES.Mailer)
		private readonly mailer: MailerGateway,
	) {
		this.boundHandle = this.handle.bind(this)
	}

	subscribe(): void {
		DomainEventPublisher.instance.subscribe(
			EVENTS.PASSWORD_RESET_REQUESTED,
			this.boundHandle,
		)
	}

	unsubscribe(): void {
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.PASSWORD_RESET_REQUESTED,
			this.boundHandle,
		)
	}

	private async handle(event: DomainEvent<unknown>): Promise<void> {
		if (!(event instanceof PasswordResetRequestedEvent)) return

		const resetLink = `${env.FRONTEND_URL}/redefinir-senha?token=${event.payload.rawToken}`

		try {
			const html = await render(
				createElement(PasswordResetEmailTemplate, {
					email: event.payload.userEmail,
					name: event.payload.userName,
					resetLink,
				}),
			)

			await this.mailer.sendMail({
				to: event.payload.userEmail,
				subject: "Recuperação de senha",
				html,
			})
		} catch (error) {
			console.error(
				"[SendPasswordResetEmailNotification] Failed to send password reset email",
				error,
			)
		}
	}
}
