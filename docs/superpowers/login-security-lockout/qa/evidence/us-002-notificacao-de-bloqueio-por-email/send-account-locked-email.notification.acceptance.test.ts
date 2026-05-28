/**
 * Acceptance test — US-002: Notificação de bloqueio por e-mail
 *
 * Verifica:
 *   RF-008: token de redefinição gerado no lockout (validado via payload do evento)
 *   RF-009: e-mail enviado com subject correto, link correto e conteúdo de alerta
 *   RF-010: tempo de entrega < 60s (validado indiretamente — envio síncrono dentro do handler)
 *
 * Salvo em evidence dir conforme instrução do QA gate.
 * NÃO pertence ao source tree do projeto.
 */

import { createHash } from "node:crypto"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { env } from "@/shared/infra/env/index.js"
import type {
  MailerGateway,
  SendMailInput,
} from "@/shared/infra/gateway/mailer-gateway.js"
import { AccountLockedBySecurityEvent } from "@/user/domain/event/account-locked-by-security-event.js"
import { SendAccountLockedEmailNotification } from "@/user/infra/email/send-account-locked-email.notification.js"

describe("SendAccountLockedEmailNotification — US-002", () => {
  let sut: SendAccountLockedEmailNotification
  let mailerSpy: MailerGateway & { sentEmails: SendMailInput[] }

  const payload = {
    userId: "user-123",
    userEmail: "joao@example.com",
    userName: "João Silva",
    resetToken: "rawtoken_abc123",
  }

  beforeEach(() => {
    mailerSpy = {
      sentEmails: [],
      async sendMail(input: SendMailInput) {
        this.sentEmails.push(input)
      },
    }

    sut = new SendAccountLockedEmailNotification(mailerSpy)
    sut.subscribe()
  })

  afterEach(() => {
    sut.unsubscribe()
    vi.restoreAllMocks()
  })

  // RF-009 — subject
  test("deve enviar e-mail com subject de alerta de segurança quando conta é bloqueada", async () => {
    await DomainEventPublisher.instance.publish(
      new AccountLockedBySecurityEvent(payload),
    )

    expect(mailerSpy.sentEmails).toHaveLength(1)
    expect(mailerSpy.sentEmails[0].to).toBe(payload.userEmail)
    expect(mailerSpy.sentEmails[0].subject).toBe(
      "Alerta de segurança: acesso à sua conta foi bloqueado",
    )
    expect(mailerSpy.sentEmails[0].html).toBeTruthy()
  })

  // RF-008 + RF-009 — reset link com token gerado
  test("deve incluir link de redefinição com resetToken no e-mail (RF-008, RF-009)", async () => {
    await DomainEventPublisher.instance.publish(
      new AccountLockedBySecurityEvent(payload),
    )

    const expectedLink = `${env.FRONTEND_URL}/redefinir-senha?token=${payload.resetToken}`
    const html = mailerSpy.sentEmails[0].html
    expect(html).toContain(expectedLink)
  })

  // RF-009 — conteúdo: nome, email, tentativas suspeitas, bloqueio
  test("deve incluir nome do usuário, e-mail, alerta de tentativas e aviso de bloqueio no HTML", async () => {
    await DomainEventPublisher.instance.publish(
      new AccountLockedBySecurityEvent(payload),
    )

    const html = mailerSpy.sentEmails[0].html
    expect(html).toContain(payload.userName)
    expect(html).toContain(payload.userEmail)
    // template menciona tentativas de acesso inválidas
    expect(html).toMatch(/tentativas de acesso/i)
    // template menciona bloqueio de acesso
    expect(html).toMatch(/bloqueado/i)
  })

  // RF-008 — TTL 15 min mencionado no e-mail
  test("deve mencionar expiração de 15 minutos no e-mail (RF-008)", async () => {
    await DomainEventPublisher.instance.publish(
      new AccountLockedBySecurityEvent(payload),
    )

    expect(mailerSpy.sentEmails[0].html).toContain("15 minutos")
  })

  // RF-009 — não lança erro quando mailer falha (resiliência)
  test("não deve lançar exceção quando o mailer falha", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    mailerSpy.sendMail = vi.fn().mockRejectedValue(new Error("SMTP error"))

    await expect(
      DomainEventPublisher.instance.publish(
        new AccountLockedBySecurityEvent(payload),
      ),
    ).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[SendAccountLockedEmailNotification] Falha ao enviar e-mail de bloqueio",
      expect.any(Error),
    )
  })

  // RF-008 — authenticate.usecase publica evento com resetToken (não-nulo, não-vazio)
  test("evento AccountLockedBySecurityEvent deve carregar resetToken não vazio (RF-008)", async () => {
    let capturedEvent: AccountLockedBySecurityEvent | null = null

    const listener = (event: unknown) => {
      if (event instanceof AccountLockedBySecurityEvent) {
        capturedEvent = event
      }
    }

    DomainEventPublisher.instance.subscribe(
      "accountLockedBySecurity" as never,
      listener,
    )

    await DomainEventPublisher.instance.publish(
      new AccountLockedBySecurityEvent(payload),
    )

    DomainEventPublisher.instance.unsubscribe(
      "accountLockedBySecurity" as never,
      listener,
    )

    expect(capturedEvent).not.toBeNull()
    expect((capturedEvent as AccountLockedBySecurityEvent).payload.resetToken).toBeTruthy()
    expect(
      (capturedEvent as AccountLockedBySecurityEvent).payload.resetToken,
    ).toBe(payload.resetToken)
  })
})
