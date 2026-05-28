# Task 11: `SendAccountLockedEmailNotification` + IoC + bootstrap [RF-008, RF-009, RF-010]

**Status:** PENDING
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Cria o handler de notificação `SendAccountLockedEmailNotification` que subscreve ao `AccountLockedBySecurityEvent` e envia o e-mail de alerta usando o template da Task 10. Registra no IoC container e ativa no bootstrap de inicialização da aplicação.

## Arquivos

- Create: `apps/backend/src/user/infra/email/send-account-locked-email.notification.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`

### Conformidade com as Skills Padrão

- no-workarounds: padrão exato de `SendPasswordResetEmailNotification`

## Passos

- [ ] **Step 1: Criar `SendAccountLockedEmailNotification`**

Arquivo: `apps/backend/src/user/infra/email/send-account-locked-email.notification.ts`

```typescript
import { render } from "@react-email/render"
import { inject, injectable } from "inversify"
import { createElement } from "react"

import type { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import { env } from "@/shared/infra/env/index.js"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { AccountLockedBySecurityEvent } from "@/user/domain/event/account-locked-by-security-event.js"

import { AccountLockedEmailTemplate } from "./templates/account-locked-email.template.js"

@injectable()
export class SendAccountLockedEmailNotification {
  private readonly boundHandle: (event: DomainEvent<unknown>) => Promise<void>

  constructor(
    @inject(SHARED_TYPES.Mailer)
    private readonly mailer: MailerGateway,
  ) {
    this.boundHandle = this.handle.bind(this)
  }

  public subscribe(): void {
    DomainEventPublisher.instance.subscribe(
      EVENTS.ACCOUNT_LOCKED_BY_SECURITY,
      this.boundHandle,
    )
  }

  public unsubscribe(): void {
    DomainEventPublisher.instance.unsubscribe(
      EVENTS.ACCOUNT_LOCKED_BY_SECURITY,
      this.boundHandle,
    )
  }

  private async handle(event: DomainEvent<unknown>): Promise<void> {
    if (!(event instanceof AccountLockedBySecurityEvent)) return

    const resetLink = `${env.FRONTEND_URL}/redefinir-senha?token=${event.payload.resetToken}`

    try {
      const html = await render(
        createElement(AccountLockedEmailTemplate, {
          name: event.payload.userName,
          email: event.payload.userEmail,
          resetLink,
        }),
      )

      await this.mailer.sendMail({
        to: event.payload.userEmail,
        subject: "Alerta de segurança: acesso à sua conta foi bloqueado",
        html,
      })
    } catch (error) {
      console.error(
        "[SendAccountLockedEmailNotification] Falha ao enviar e-mail de bloqueio",
        error,
      )
    }
  }
}
```

- [ ] **Step 2: Adicionar símbolo `SendAccountLockedEmail` em `user-types.ts`**

Arquivo: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`

Dentro de `USER_TYPES.Notifications`, adicionar:

```typescript
Notifications: {
  SendWelcomeEmail: Symbol.for("SendWelcomeEmailNotification"),
  SendPasswordAlertEmail: Symbol.for("SendPasswordAlertEmailNotification"),
  SendPasswordResetEmail: Symbol.for("SendPasswordResetEmailNotification"),
  SendAccountLockedEmail: Symbol.for("SendAccountLockedEmailNotification"),
},
```

- [ ] **Step 3: Registrar no IoC container**

Arquivo: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`

Adicionar import no topo:

```typescript
import { SendAccountLockedEmailNotification } from "@/user/infra/email/send-account-locked-email.notification"
```

Adicionar binding (junto com as outras notifications):

```typescript
bind(USER_TYPES.Notifications.SendAccountLockedEmail)
  .to(SendAccountLockedEmailNotification)
  .inSingletonScope()
```

- [ ] **Step 4: Ativar a subscription no bootstrap**

Arquivo: `apps/backend/src/bootstrap/setup-user-module.ts`

Adicionar import no topo:

```typescript
import type { SendAccountLockedEmailNotification } from "@/user/infra/email/send-account-locked-email.notification"
```

Adicionar resolução e subscription (junto com as outras notifications):

```typescript
const accountLockedEmail = resolve<SendAccountLockedEmailNotification>(
  USER_TYPES.Notifications.SendAccountLockedEmail,
)
accountLockedEmail.subscribe()
```

- [ ] **Step 5: Verificar que o TypeScript compila sem erros**

```bash
pnpm --filter backend tsc:check
```

Esperado: zero erros de tipo.

- [ ] **Step 6: Rodar suite completa para verificar regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/user/infra/email/send-account-locked-email.notification.ts \
        apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts \
        apps/backend/src/shared/infra/ioc/module/user/user-module.ts \
        apps/backend/src/bootstrap/setup-user-module.ts
git commit -m "feat(login-security-lockout): adicionar SendAccountLockedEmailNotification e registrar no IoC"
```

## Critérios de Sucesso

- `SendAccountLockedEmailNotification` subscreve a `EVENTS.ACCOUNT_LOCKED_BY_SECURITY`
- E-mail enviado com assunto correto e link `{env.FRONTEND_URL}/redefinir-senha?token={resetToken}`
- Registrado em `USER_TYPES.Notifications.SendAccountLockedEmail`
- Bound em `user-module.ts` com `.inSingletonScope()`
- `.subscribe()` chamado em `setup-user-module.ts`
- `tsc:check` e `test:run` passam [RF-008, RF-009, RF-010]
