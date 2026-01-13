export interface MailerGateway {
	sendMail(to: string, subject: string, text: string): Promise<void>
}
