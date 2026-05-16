import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event.js"
import { UserCreatedEvent } from "@/user/domain/event/user-created-event.js"
import { SendPasswordAlertEmailNotification } from "@/user/infra/email/send-password-alert-email.notification.js"
import { SendWelcomeEmailNotification } from "@/user/infra/email/send-welcome-email.notification.js"

describe("US-003 - resiliência a falhas de email", () => {
  let welcomeNotification: SendWelcomeEmailNotification
  let passwordNotification: SendPasswordAlertEmailNotification

  beforeEach(() => {
    const failingMailer: MailerGateway = {
      sendMail: vi.fn().mockRejectedValue(new Error("SMTP down")),
    }

    welcomeNotification = new SendWelcomeEmailNotification(failingMailer)
    passwordNotification = new SendPasswordAlertEmailNotification(failingMailer)

    welcomeNotification.subscribe()
    passwordNotification.subscribe()
  })

  afterEach(() => {
    welcomeNotification.unsubscribe()
    passwordNotification.unsubscribe()
    vi.restoreAllMocks()
  })

  test("não bloqueia os fluxos e registra log quando o envio de email falha", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    await expect(
      DomainEventPublisher.instance.publish(
        new UserCreatedEvent({
          email: "joao@example.com",
          name: "João Silva",
        }),
      ),
    ).resolves.toBeUndefined()

    await expect(
      DomainEventPublisher.instance.publish(
        new PasswordChangedEvent({
          userEmail: "joao@example.com",
          userName: "João Silva",
        }),
      ),
    ).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[SendWelcomeEmailNotification]",
      expect.any(Error),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[SendPasswordAlertEmailNotification]",
      expect.any(Error),
    )
  })
})
