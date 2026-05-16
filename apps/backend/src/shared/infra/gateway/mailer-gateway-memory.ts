import { inject, injectable } from "inversify"

import { SHARED_TYPES } from "../ioc/types"
import type { Logger } from "../logger/logger"
import type { MailerGateway, SendMailInput } from "./mailer-gateway"

@injectable()
export class MailerGatewayMemory implements MailerGateway {
	public readonly sentEmails: SendMailInput[] = []

	constructor(
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
	) {}

	public async sendMail(input: SendMailInput): Promise<void> {
		this.sentEmails.push(input)
		this.logger.info(this, `Sending email to: ${input.to}`)
		this.logger.info(this, `Subject: ${input.subject}`)
	}
}
