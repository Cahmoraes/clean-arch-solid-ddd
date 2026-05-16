# Task 5: Criar WelcomeEmailTemplate + SendWelcomeEmailNotification + testes unitários [RF-001, RF-002, RF-003, RF-004, RF-010, RF-011]

**Status:** PENDING
**PRD:** `../prd/prd-user-email-notifications.md`
**Spec:** `../specs/user-email-notifications-design.md`

## Visão Geral

Criar o template React Email de boas-vindas e a classe `SendWelcomeEmailNotification` que escuta `UserCreatedEvent` via `DomainEventPublisher` e envia o email. A classe expõe `subscribe()` e `unsubscribe()` para controle explícito da inscrição no publisher (facilitando testes e evitando duplo-registro).

**Pré-requisito:** Tasks 1, 2 e 4 devem estar concluídas.

## Arquivos

- Create: `apps/backend/src/user/infra/email/templates/welcome-email.template.tsx`
- Create: `apps/backend/src/user/infra/email/send-welcome-email.notification.ts`
- Create: `apps/backend/src/user/infra/email/send-welcome-email.notification.test.ts`

### Conformidade com as Skills Padrão

- test-antipatterns: testar comportamento (email enviado com dados corretos) não implementação (render interno)
- no-workarounds: `try/catch` no handler sem relançar o erro — falha de email não interrompe o fluxo principal

## Passos

- [ ] **Step 1: Criar o diretório de email**

```bash
mkdir -p apps/backend/src/user/infra/email/templates
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `apps/backend/src/user/infra/email/send-welcome-email.notification.test.ts`:

```typescript
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import type { MailerGateway, SendMailInput } from "@/shared/infra/gateway/mailer-gateway"
import { UserCreatedEvent } from "@/user/domain/event/user-created-event"
import { SendWelcomeEmailNotification } from "./send-welcome-email.notification"

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
    mailerSpy.sendMail = vi.fn().mockRejectedValue(new Error("SMTP error"))

    await expect(
      DomainEventPublisher.instance.publish(
        new UserCreatedEvent({ email: "joao@example.com", name: "João" }),
      ),
    ).resolves.not.toThrow()
  })
})
```

- [ ] **Step 3: Rodar o teste para confirmar que falha**

```bash
cd apps/backend && pnpm test:run -- -t "SendWelcomeEmailNotification"
```

Esperado: FAIL — módulo `send-welcome-email.notification` não encontrado

- [ ] **Step 4: Criar o template React Email**

Criar `apps/backend/src/user/infra/email/templates/welcome-email.template.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Text,
} from "@react-email/components"

interface WelcomeEmailTemplateProps {
  name: string
  email: string
}

export function WelcomeEmailTemplate({ name, email }: WelcomeEmailTemplateProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Body>
        <Container>
          <Heading>Bem-vindo(a), {name}! 👋</Heading>
          <Text>
            Sua conta foi criada com sucesso usando o email{" "}
            <strong>{email}</strong>.
          </Text>
          <Text>Agora você já pode começar a usar a plataforma.</Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 5: Criar a classe `SendWelcomeEmailNotification`**

Criar `apps/backend/src/user/infra/email/send-welcome-email.notification.ts`:

```typescript
import { createElement } from "react"

import { render } from "@react-email/render"
import { inject, injectable } from "inversify"

import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { UserCreatedEvent } from "@/user/domain/event/user-created-event.js"

import { WelcomeEmailTemplate } from "./templates/welcome-email.template.js"

@injectable()
export class SendWelcomeEmailNotification {
  private readonly boundHandle: (event: UserCreatedEvent) => Promise<void>

  constructor(
    @inject(SHARED_TYPES.Mailer) private readonly mailer: MailerGateway,
  ) {
    this.boundHandle = this.handle.bind(this)
  }

  subscribe(): void {
    DomainEventPublisher.instance.subscribe(EVENTS.USER_CREATED, this.boundHandle)
  }

  unsubscribe(): void {
    DomainEventPublisher.instance.unsubscribe(EVENTS.USER_CREATED, this.boundHandle)
  }

  private async handle(event: UserCreatedEvent): Promise<void> {
    try {
      const html = await render(
        createElement(WelcomeEmailTemplate, {
          email: event.payload.email,
          name: event.payload.name,
        }),
      )
      await this.mailer.sendMail({
        to: event.payload.email,
        subject: "Bem-vindo(a) à plataforma!",
        html,
      })
    } catch (error) {
      console.error("[SendWelcomeEmailNotification]", error)
    }
  }
}
```

- [ ] **Step 6: Rodar os testes para confirmar que passam**

```bash
cd apps/backend && pnpm test:run -- -t "SendWelcomeEmailNotification"
```

Esperado: PASS — 4 testes passando

- [ ] **Step 7: Rodar todos os testes para confirmar que nada quebrou**

```bash
cd apps/backend && pnpm test:run
```

Esperado: todos os testes passando

- [ ] **Step 8: Verificar tipagem**

```bash
cd apps/backend && pnpm tsc:check
```

Esperado: zero erros

- [ ] **Step 9: Commit**

```bash
cd apps/backend && git add src/user/infra/email/
git commit -m "feat: add WelcomeEmailTemplate and SendWelcomeEmailNotification

- React Email template with user name and email personalization
- Subscriber listens to UserCreatedEvent via DomainEventPublisher
- subscribe()/unsubscribe() API for safe test isolation
- Email failure is caught and logged, never propagated

Implements: RF-001, RF-002, RF-003, RF-004, RF-010, RF-011

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Email de boas-vindas enviado para `event.payload.email` ao receber `UserCreatedEvent` (RF-001)
- HTML do email contém o nome e email do usuário (RF-002, RF-003)
- Email em português (pt-BR) — subject e conteúdo (RF-003)
- Nenhum link de confirmação de conta no email (RF-004)
- Falha do mailer não lança exceção (RF-010, RF-011)
- 4 testes unitários passando
