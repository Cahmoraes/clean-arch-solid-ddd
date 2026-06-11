# Task 6: Criar PasswordAlertEmailTemplate + SendPasswordAlertEmailNotification + testes unitários [RF-005, RF-006, RF-007, RF-008, RF-009, RF-010, RF-011]

**Status:** PENDING
**PRD:** `../prd/prd-user-email-notifications.md`
**Spec:** `../specs/user-email-notifications-design.md`

## Visão Geral

Criar o template React Email de alerta de segurança e a classe `SendPasswordAlertEmailNotification` que escuta `PasswordChangedEvent` via `DomainEventPublisher` e envia o alerta. Segue o mesmo padrão da Task 5.

**Pré-requisito:** Tasks 1, 3 e 4 devem estar concluídas.

## Arquivos

- Create: `apps/backend/src/user/infra/email/templates/password-alert-email.template.tsx`
- Create: `apps/backend/src/user/infra/email/send-password-alert-email.notification.ts`
- Create: `apps/backend/src/user/infra/email/send-password-alert-email.notification.test.ts`

### Conformidade com as Skills Padrão

- test-antipatterns: testar comportamento observável (email enviado para o endereço correto com subject correto), não detalhes de renderização React
- no-workarounds: nunca incluir a senha ou dados sensíveis no email (RF-009)

## Passos

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/backend/src/user/infra/email/send-password-alert-email.notification.test.ts`:

```typescript
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import type { MailerGateway, SendMailInput } from "@/shared/infra/gateway/mailer-gateway"
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
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/backend && pnpm test:run -- -t "SendPasswordAlertEmailNotification"
```

Esperado: FAIL — módulo `send-password-alert-email.notification` não encontrado

- [ ] **Step 3: Criar o template React Email**

Criar `apps/backend/src/user/infra/email/templates/password-alert-email.template.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Text,
} from "@react-email/components"

interface PasswordAlertEmailTemplateProps {
  name: string
  email: string
}

export function PasswordAlertEmailTemplate({
  name,
  email,
}: PasswordAlertEmailTemplateProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Body>
        <Container>
          <Heading>Aviso de segurança</Heading>
          <Text>Olá, {name}.</Text>
          <Text>
            Uma senha foi definida para a sua conta (
            <strong>{email}</strong>).
          </Text>
          <Text>
            Se não foi você quem realizou esta ação, entre em contato conosco
            imediatamente.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 4: Criar a classe `SendPasswordAlertEmailNotification`**

Criar `apps/backend/src/user/infra/email/send-password-alert-email.notification.ts`:

```typescript
import { createElement } from "react"

import { render } from "@react-email/render"
import { inject, injectable } from "inversify"

import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { PasswordChangedEvent } from "@/user/domain/event/password-changed-event.js"

import { PasswordAlertEmailTemplate } from "./templates/password-alert-email.template.js"

@injectable()
export class SendPasswordAlertEmailNotification {
  private readonly boundHandle: (event: PasswordChangedEvent) => Promise<void>

  constructor(
    @inject(SHARED_TYPES.Mailer) private readonly mailer: MailerGateway,
  ) {
    this.boundHandle = this.handle.bind(this)
  }

  subscribe(): void {
    DomainEventPublisher.instance.subscribe(
      EVENTS.PASSWORD_CHANGED,
      this.boundHandle,
    )
  }

  unsubscribe(): void {
    DomainEventPublisher.instance.unsubscribe(
      EVENTS.PASSWORD_CHANGED,
      this.boundHandle,
    )
  }

  private async handle(event: PasswordChangedEvent): Promise<void> {
    try {
      const html = await render(
        createElement(PasswordAlertEmailTemplate, {
          email: event.payload.userEmail,
          name: event.payload.userName,
        }),
      )
      await this.mailer.sendMail({
        to: event.payload.userEmail,
        subject: "Aviso de segurança: senha definida na sua conta",
        html,
      })
    } catch (error) {
      console.error("[SendPasswordAlertEmailNotification]", error)
    }
  }
}
```

- [ ] **Step 5: Rodar os testes para confirmar que passam**

```bash
cd apps/backend && pnpm test:run -- -t "SendPasswordAlertEmailNotification"
```

Esperado: PASS — 5 testes passando

- [ ] **Step 6: Rodar todos os testes para confirmar que nada quebrou**

```bash
cd apps/backend && pnpm test:run
```

Esperado: todos os testes passando

- [ ] **Step 7: Verificar tipagem**

```bash
cd apps/backend && pnpm tsc:check
```

Esperado: zero erros

- [ ] **Step 8: Commit**

```bash
cd apps/backend && git add src/user/infra/email/
git commit -m "feat: add PasswordAlertEmailTemplate and SendPasswordAlertEmailNotification

- React Email template with security alert message in pt-BR
- Subscriber listens to PasswordChangedEvent via DomainEventPublisher
- No sensitive data (passwords) included in the email body
- subscribe()/unsubscribe() API for safe test isolation
- Email failure is caught and logged, never propagated

Implements: RF-005, RF-006, RF-007, RF-008, RF-009, RF-010, RF-011

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Email de alerta enviado para `event.payload.userEmail` ao receber `PasswordChangedEvent` (RF-005)
- HTML contém nome do usuário e orientação de contato (RF-006, RF-007)
- Email em português (pt-BR) (RF-008)
- HTML não contém senhas ou dados sensíveis além do email da conta (RF-009)
- Falha do mailer não lança exceção (RF-010, RF-011)
- 5 testes unitários passando
