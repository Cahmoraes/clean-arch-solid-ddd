import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import type {
	MailerGateway,
	SendMailInput,
} from "@/shared/infra/gateway/mailer-gateway"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import { SendPasswordAlertEmailNotification } from "./send-password-alert-email.notification"

describe("SendPasswordAlertEmailNotification", () => {
	let sut: SendPasswordAlertEmailNotification
	let mailerSpy: MailerGateway & { sentEmails: SendMailInput[] }

	beforeEach(() => {
		mailerSpy = {
			sentEmails: [],
			async sendMail(input: SendMailInput) {
				this.sentEmails.push(input)
			},
		}
		sut = new SendPasswordAlertEmailNotification(mailerSpy)
		sut.subscribe()
	})

	afterEach(() => {
		sut.unsubscribe()
	})

	test("deve enviar email de alerta quando PasswordChangedEvent é publicado", async () => {
		await DomainEventPublisher.instance.publish(
			new PasswordChangedEvent({
				userEmail: "joao@example.com",
				userName: "João Silva",
			}),
		)

		expect(mailerSpy.sentEmails).toHaveLength(1)
		expect(mailerSpy.sentEmails[0].to).toBe("joao@example.com")
		expect(mailerSpy.sentEmails[0].subject).toBe(
			"Aviso de segurança: senha definida na sua conta",
		)
		expect(mailerSpy.sentEmails[0].html).toBeTruthy()
	})

	test("deve incluir o nome do usuário no HTML do email", async () => {
		await DomainEventPublisher.instance.publish(
			new PasswordChangedEvent({
				userEmail: "joao@example.com",
				userName: "João Silva",
			}),
		)

		expect(mailerSpy.sentEmails[0].html).toContain("João Silva")
	})

	test("deve incluir orientação de contato no HTML do email", async () => {
		await DomainEventPublisher.instance.publish(
			new PasswordChangedEvent({
				userEmail: "joao@example.com",
				userName: "João Silva",
			}),
		)

		expect(mailerSpy.sentEmails[0].html).toContain("contato")
	})

	test("não deve incluir senhas ou dados sensíveis no HTML do email", async () => {
		await DomainEventPublisher.instance.publish(
			new PasswordChangedEvent({
				userEmail: "joao@example.com",
				userName: "João Silva",
			}),
		)

		const html = mailerSpy.sentEmails[0].html
		expect(html).not.toContain("password")
		expect(html).not.toContain("senha123")
	})

	test("não deve lançar erro quando o mailer falha", async () => {
		mailerSpy.sendMail = vi.fn().mockRejectedValue(new Error("SMTP error"))

		await expect(
			DomainEventPublisher.instance.publish(
				new PasswordChangedEvent({
					userEmail: "joao@example.com",
					userName: "João Silva",
				}),
			),
		).resolves.not.toThrow()
	})
})
