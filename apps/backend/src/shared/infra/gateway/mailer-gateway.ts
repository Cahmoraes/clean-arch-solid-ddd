export interface SendMailInput {
	to: string
	subject: string
	html: string
	text?: string
}

export interface MailerGateway {
	sendMail(input: SendMailInput): Promise<void>
}
