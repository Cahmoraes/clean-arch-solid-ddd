import { container } from "@/shared/infra/ioc/container"
import type { SendMailInput } from "./mailer-gateway"
import { MailerGatewayMemory } from "./mailer-gateway-memory"

describe("MailerGatewayMemory", () => {
	let sut: MailerGatewayMemory

	beforeEach(() => {
		container.snapshot()
		sut = container.get(MailerGatewayMemory)
	})

	afterEach(() => {
		container.restore()
	})

	test("deve armazenar o email enviado em sentEmails", async () => {
		const input: SendMailInput = {
			to: "test@example.com",
			subject: "Test Subject",
			html: "<p>Test body</p>",
		}

		await sut.sendMail(input)

		expect(sut.sentEmails).toHaveLength(1)
		expect(sut.sentEmails[0].to).toBe("test@example.com")
		expect(sut.sentEmails[0].subject).toBe("Test Subject")
		expect(sut.sentEmails[0].html).toBe("<p>Test body</p>")
	})

	test("deve acumular múltiplos emails em sentEmails", async () => {
		await sut.sendMail({ to: "a@a.com", subject: "A", html: "<p>A</p>" })
		await sut.sendMail({ to: "b@b.com", subject: "B", html: "<p>B</p>" })

		expect(sut.sentEmails).toHaveLength(2)
		expect(sut.sentEmails[1].to).toBe("b@b.com")
	})
})
