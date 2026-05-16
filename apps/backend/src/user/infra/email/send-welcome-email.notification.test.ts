import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import type {
	MailerGateway,
	SendMailInput,
} from "@/shared/infra/gateway/mailer-gateway.js"
import { UserCreatedEvent } from "@/user/domain/event/user-created-event.js"

import { SendWelcomeEmailNotification } from "./send-welcome-email.notification.js"

describe("SendWelcomeEmailNotification", () => {
	let sut: SendWelcomeEmailNotification
	let mailerSpy: MailerGateway & { sentEmails: SendMailInput[] }

	beforeEach(() => {
		mailerSpy = {
			sentEmails: [],
			async sendMail(input: SendMailInput) {
				this.sentEmails.push(input)
			},
		}

		sut = new SendWelcomeEmailNotification(mailerSpy)
		sut.subscribe()
	})

	afterEach(() => {
		sut.unsubscribe()
	})

	test("deve enviar email de boas-vindas quando UserCreatedEvent é publicado", async () => {
		await DomainEventPublisher.instance.publish(
			new UserCreatedEvent({ email: "joao@example.com", name: "João Silva" }),
		)

		expect(mailerSpy.sentEmails).toHaveLength(1)
		expect(mailerSpy.sentEmails[0].to).toBe("joao@example.com")
		expect(mailerSpy.sentEmails[0].subject).toBe("Bem-vindo(a) à plataforma!")
		expect(mailerSpy.sentEmails[0].html).toBeTruthy()
	})

	test("deve incluir o nome do usuário no HTML do email", async () => {
		await DomainEventPublisher.instance.publish(
			new UserCreatedEvent({ email: "joao@example.com", name: "João Silva" }),
		)

		expect(mailerSpy.sentEmails[0].html).toContain("João Silva")
	})

	test("deve incluir o email do usuário no HTML do email", async () => {
		await DomainEventPublisher.instance.publish(
			new UserCreatedEvent({ email: "joao@example.com", name: "João Silva" }),
		)

		expect(mailerSpy.sentEmails[0].html).toContain("joao@example.com")
	})

	test("não deve lançar erro quando o mailer falha", async () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {})
		mailerSpy.sendMail = vi.fn().mockRejectedValue(new Error("SMTP error"))

		await expect(
			DomainEventPublisher.instance.publish(
				new UserCreatedEvent({ email: "joao@example.com", name: "João" }),
			),
		).resolves.toBeUndefined()

		expect(consoleErrorSpy).toHaveBeenCalled()
		consoleErrorSpy.mockRestore()
	})
})
