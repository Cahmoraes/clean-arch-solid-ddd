import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { env } from "@/shared/infra/env/index.js"
import type {
	MailerGateway,
	SendMailInput,
} from "@/shared/infra/gateway/mailer-gateway.js"
import { PasswordResetRequestedEvent } from "@/user/domain/event/password-reset-requested-event.js"

import { SendPasswordResetEmailNotification } from "./send-password-reset-email.notification.js"

describe("SendPasswordResetEmailNotification", () => {
	let sut: SendPasswordResetEmailNotification
	let mailerSpy: MailerGateway & { sentEmails: SendMailInput[] }

	beforeEach(() => {
		mailerSpy = {
			sentEmails: [],
			async sendMail(input: SendMailInput) {
				this.sentEmails.push(input)
			},
		}

		sut = new SendPasswordResetEmailNotification(mailerSpy)
		sut.subscribe()
	})

	afterEach(() => {
		sut.unsubscribe()
		vi.restoreAllMocks()
	})

	test("deve enviar email de redefinição quando PasswordResetRequestedEvent é publicado", async () => {
		await DomainEventPublisher.instance.publish(
			new PasswordResetRequestedEvent({
				userEmail: "joao@example.com",
				userName: "João Silva",
				rawToken: "abc123",
			}),
		)

		expect(mailerSpy.sentEmails).toHaveLength(1)
		expect(mailerSpy.sentEmails[0].to).toBe("joao@example.com")
		expect(mailerSpy.sentEmails[0].subject).toBe("Recuperação de senha")
		expect(mailerSpy.sentEmails[0].html).toBeTruthy()
	})

	test("deve incluir nome, email, link de redefinição e aviso de expiração no HTML", async () => {
		await DomainEventPublisher.instance.publish(
			new PasswordResetRequestedEvent({
				userEmail: "joao@example.com",
				userName: "João Silva",
				rawToken: "abc123",
			}),
		)

		const html = mailerSpy.sentEmails[0].html

		expect(html).toContain("João Silva")
		expect(html).toContain("joao@example.com")
		expect(html).toContain(`${env.FRONTEND_URL}/redefinir-senha?token=abc123`)
		expect(html).toContain("15 minutos")
	})

	test("deve incluir aviso de segurança quando a redefinição não foi solicitada", async () => {
		await DomainEventPublisher.instance.publish(
			new PasswordResetRequestedEvent({
				userEmail: "joao@example.com",
				userName: "João Silva",
				rawToken: "abc123",
			}),
		)

		expect(mailerSpy.sentEmails[0].html).toContain(
			"Se você não solicitou a redefinição de senha",
		)
	})

	test("não deve lançar erro quando o mailer falha", async () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {})
		mailerSpy.sendMail = vi.fn().mockRejectedValue(new Error("SMTP error"))

		await expect(
			DomainEventPublisher.instance.publish(
				new PasswordResetRequestedEvent({
					userEmail: "joao@example.com",
					userName: "João Silva",
					rawToken: "abc123",
				}),
			),
		).resolves.toBeUndefined()

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"[SendPasswordResetEmailNotification] Failed to send password reset email",
			expect.any(Error),
		)
	})
})
