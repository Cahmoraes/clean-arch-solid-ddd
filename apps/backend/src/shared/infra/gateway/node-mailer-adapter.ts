import { inject, injectable } from "inversify"
import nodemailer, { type SentMessageInfo, type Transporter } from "nodemailer"
import { Logger as LoggerDecorate } from "../decorator/logger"
import { SHARED_TYPES } from "../ioc/types"
import type { Logger } from "../logger/logger"
import type { MailerGateway, SendMailInput } from "./mailer-gateway"
import { Retry } from "./retry"

@injectable()
export class NodeMailerAdapter implements MailerGateway {
	private transporter?: Transporter

	constructor(@inject(SHARED_TYPES.Logger) private readonly logger: Logger) {
		void this.init()
	}

	@LoggerDecorate({
		message: "✅",
	})
	private async init(): Promise<void> {
		if (process.env.SMTP_HOST) {
			this.transporter = nodemailer.createTransport({
				host: process.env.SMTP_HOST,
				port: Number(process.env.SMTP_PORT ?? 587),
				secure: process.env.SMTP_PORT === "465",
				auth: {
					user: process.env.SMTP_USER,
					pass: process.env.SMTP_PASS,
				},
			})
		} else {
			const testAccount = await nodemailer.createTestAccount()
			this.transporter = nodemailer.createTransport({
				host: testAccount.smtp.host,
				port: testAccount.smtp.port,
				secure: testAccount.smtp.secure,
				auth: {
					user: testAccount.user,
					pass: testAccount.pass,
				},
			})
		}
	}

	public async sendMail(input: SendMailInput): Promise<void> {
		if (!this.transporter) await this.init()
		if (!this.transporter) throw new Error("Transporter not initialized")
		const mailOptions = {
			from: process.env.SMTP_FROM ?? '"No Reply" <no-reply@test.com>',
			to: input.to,
			subject: input.subject,
			html: input.html,
			text: input.text,
		}
		const sendMailWithRetry = Retry.wrap({
			callback: this.transporter.sendMail.bind(this.transporter),
			maxAttempts: 3,
			time: 1000,
		})
		void sendMailWithRetry
			.run(mailOptions)
			.then((mailResponse) => {
				this.fireAndForgetSendMail(mailResponse)
			})
			.catch((error) => {
				this.logger.error(this, `Failed to send email: ${error}`)
			})
	}

	private async fireAndForgetSendMail(
		mailResponse: SentMessageInfo,
	): Promise<void> {
		this.logger.info(this, `Email sent ${mailResponse.messageId}`)
		const testMessageURL = nodemailer.getTestMessageUrl(mailResponse)
		this.logger.info(this, `Preview URL: ${testMessageURL}`)
	}
}
