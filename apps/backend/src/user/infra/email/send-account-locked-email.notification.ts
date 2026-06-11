import { render } from "@react-email/render"
import { inject, injectable } from "inversify"
import { createElement } from "react"

import type { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import { env } from "@/shared/infra/env/index.js"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { AccountLockedBySecurityEvent } from "@/user/domain/event/account-locked-by-security-event.js"

import { AccountLockedEmailTemplate } from "./templates/account-locked-email.template.js"

@injectable()
export class SendAccountLockedEmailNotification {
	private readonly boundHandle: (event: DomainEvent<unknown>) => Promise<void>

	constructor(
		@inject(SHARED_TYPES.Mailer)
		private readonly mailer: MailerGateway,
	) {
		this.boundHandle = this.handle.bind(this)
	}

	subscribe(): void {
		DomainEventPublisher.instance.subscribe(
			EVENTS.ACCOUNT_LOCKED_BY_SECURITY,
			this.boundHandle,
		)
	}

	unsubscribe(): void {
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.ACCOUNT_LOCKED_BY_SECURITY,
			this.boundHandle,
		)
	}

	private async handle(event: DomainEvent<unknown>): Promise<void> {
		if (!(event instanceof AccountLockedBySecurityEvent)) return

		const resetLink = `${env.FRONTEND_URL}/redefinir-senha?token=${event.payload.resetToken}`

		try {
			const html = await render(
				createElement(AccountLockedEmailTemplate, {
					name: event.payload.userName,
					email: event.payload.userEmail,
					resetLink,
				}),
			)

			await this.mailer.sendMail({
				to: event.payload.userEmail,
				subject: "Alerta de segurança: acesso à sua conta foi bloqueado",
				html,
			})
		} catch (error) {
			console.error(
				"[SendAccountLockedEmailNotification] Falha ao enviar e-mail de bloqueio",
				error,
			)
		}
	}
}
