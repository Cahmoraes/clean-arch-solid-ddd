import assert from "node:assert/strict"

import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import type {
  MailerGateway,
  SendMailInput,
} from "@/shared/infra/gateway/mailer-gateway.js"
import { UserCreatedEvent } from "@/user/domain/event/user-created-event.js"
import { SendWelcomeEmailNotification } from "@/user/infra/email/send-welcome-email.notification.js"

async function run() {
  const mailerSpy: MailerGateway & { sentEmails: SendMailInput[] } = {
    sentEmails: [],
    async sendMail(input: SendMailInput) {
      this.sentEmails.push(input)
    },
  }

  const sut = new SendWelcomeEmailNotification(mailerSpy)
  sut.subscribe()

  try {
    await DomainEventPublisher.instance.publish(
      new UserCreatedEvent({
        email: "joao@example.com",
        name: "João Silva",
      }),
    )

    assert.equal(mailerSpy.sentEmails.length, 1)

    const [sentEmail] = mailerSpy.sentEmails

    assert.equal(sentEmail.to, "joao@example.com")
    assert.equal(sentEmail.subject, "Bem-vindo(a) à plataforma!")
    assert.ok(sentEmail.html.includes("João Silva"))
    assert.ok(sentEmail.html.includes("joao@example.com"))
    assert.ok(sentEmail.html.includes('lang="pt-BR"'))
    assert.ok(sentEmail.html.includes("Bem-vindo"))
    assert.ok(sentEmail.html.includes("Sua conta foi criada com sucesso"))
    assert.equal(
      /href\s*=\s*["'][^"']*(verify|verifica)/i.test(sentEmail.html),
      false,
    )
    assert.equal(sentEmail.html.includes("verificação"), false)

    console.log(
      JSON.stringify(
        {
          status: "passed",
          verified: ["RF-001", "RF-002", "RF-003", "RF-004"],
          emailTo: sentEmail.to,
          subject: sentEmail.subject,
        },
        null,
        2,
      ),
    )
  } finally {
    sut.unsubscribe()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
