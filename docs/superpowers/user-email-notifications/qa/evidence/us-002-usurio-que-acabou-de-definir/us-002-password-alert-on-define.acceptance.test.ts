import { DomainEventPublisher } from "../../../../../../apps/backend/src/shared/domain/event/domain-event-publisher"
import type {
  MailerGateway,
  SendMailInput,
} from "../../../../../../apps/backend/src/shared/infra/gateway/mailer-gateway"
import { PasswordChangedEvent } from "../../../../../../apps/backend/src/user/domain/event/password-changed-event"
import { SendPasswordAlertEmailNotification } from "../../../../../../apps/backend/src/user/infra/email/send-password-alert-email.notification"

describe("US-002 - alerta de segurança ao definir senha", () => {
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

  test("deve enviar um email pt-BR com identificação da conta e sem dados sensíveis", async () => {
    const userName = "João Silva"
    const userEmail = "joao@example.com"
    const rawPassword = "Senha123!"
    const fakeAuthToken = "Bearer secret-token-123"

    await DomainEventPublisher.instance.publish(
      new PasswordChangedEvent({
        userEmail,
        userName,
      }),
    )

    expect(mailerSpy.sentEmails).toHaveLength(1)

    const sentEmail = mailerSpy.sentEmails[0]
    expect(sentEmail.to).toBe(userEmail)
    expect(sentEmail.subject).toBe(
      "Aviso de segurança: senha definida na sua conta",
    )

    const { html } = sentEmail
    expect(html).toContain('lang="pt-BR"')
    expect(html).toContain(userName)
    expect(html).toContain(userEmail)
    expect(html).toContain("Uma senha foi definida para a sua conta")
    expect(html).toContain("entre em contato conosco")
    expect(html).not.toContain(rawPassword)
    expect(html).not.toContain(fakeAuthToken)
    expect(html).not.toContain("accessToken")
    expect(html).not.toContain("refreshToken")
    expect(html).not.toContain("jwt")
  })
})
