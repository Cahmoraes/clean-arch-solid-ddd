# Task 5: Email template + SendPasswordResetEmailNotification + bootstrap [RF-014, RF-015, RF-016]

**Status:** PENDING
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

Cria o template React Email para o link de reset de senha, a classe de notificação que subscreve ao `PasswordResetRequestedEvent` (publicado pelo `ForgotPasswordUseCase`), e adiciona a variável de ambiente `FRONTEND_URL`. A notificação constrói o link de reset e envia o email via `MailerGateway`. O bootstrap é atualizado para registrar a subscription.

## Arquivos

- Modify: `apps/backend/src/shared/infra/env/index.ts` (ou onde está o schema zod do env)
- Create: `apps/backend/src/user/infra/email/templates/password-reset-email.template.tsx`
- Create: `apps/backend/src/user/infra/email/send-password-reset-email.notification.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`

### Conformidade com as Skills Padrão

- test-antipatterns: não mocke `MailerGateway` no unit test — a notificação tem sua própria lógica isolável

## Passos

- [ ] **Step 1: Adicionar `FRONTEND_URL` ao schema de env**

Localize o arquivo de env do backend (provavelmente `apps/backend/src/shared/infra/env/index.ts`). Encontre o schema zod e adicione:

```ts
FRONTEND_URL: z.string().url().default("http://localhost:3000"),
```

Exemplo de como o schema deve ficar (adicione a linha entre as existentes):
```ts
const envSchema = z.object({
  // ... outros campos ...
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  // ... outros campos ...
})
```

- [ ] **Step 2: Criar o template React Email**

Crie `apps/backend/src/user/infra/email/templates/password-reset-email.template.tsx`:

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Section,
  Text,
} from "@react-email/components"

interface PasswordResetEmailTemplateProps {
  name: string
  email: string
  resetLink: string
}

export function PasswordResetEmailTemplate({
  name,
  email,
  resetLink,
}: PasswordResetEmailTemplateProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Body>
        <Container>
          <Heading>Recuperação de senha</Heading>
          <Text>Olá, {name}.</Text>
          <Text>
            Recebemos uma solicitação de redefinição de senha para a conta{" "}
            <strong>{email}</strong>.
          </Text>
          <Section>
            <Button href={resetLink}>Redefinir minha senha</Button>
          </Section>
          <Text>
            Este link expira em <strong>15 minutos</strong>.
          </Text>
          <Text>
            Se você não solicitou a redefinição de senha, ignore este e-mail.
            Sua senha permanecerá a mesma.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 3: Criar `SendPasswordResetEmailNotification`**

Crie `apps/backend/src/user/infra/email/send-password-reset-email.notification.ts`:

```ts
import { render } from "@react-email/render"
import { inject, injectable } from "inversify"
import { createElement } from "react"
import type { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { EVENTS } from "@/shared/domain/event/events.js"
import { env } from "@/shared/infra/env/index.js"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { PasswordResetRequestedEvent } from "@/user/domain/event/password-reset-requested-event.js"
import { PasswordResetEmailTemplate } from "./templates/password-reset-email.template.js"

@injectable()
export class SendPasswordResetEmailNotification {
  private readonly boundHandle: (event: DomainEvent<unknown>) => Promise<void>

  constructor(
    @inject(SHARED_TYPES.Mailer)
    private readonly mailer: MailerGateway,
  ) {
    this.boundHandle = this.handle.bind(this)
  }

  public subscribe(): void {
    DomainEventPublisher.instance.subscribe(
      EVENTS.PASSWORD_RESET_REQUESTED,
      this.boundHandle,
    )
  }

  public unsubscribe(): void {
    DomainEventPublisher.instance.unsubscribe(
      EVENTS.PASSWORD_RESET_REQUESTED,
      this.boundHandle,
    )
  }

  private async handle(event: DomainEvent<unknown>): Promise<void> {
    if (!(event instanceof PasswordResetRequestedEvent)) return
    try {
      const resetLink = `${env.FRONTEND_URL}/redefinir-senha?token=${event.payload.rawToken}`
      const html = await render(
        createElement(PasswordResetEmailTemplate, {
          email: event.payload.userEmail,
          name: event.payload.userName,
          resetLink,
        }),
      )
      await this.mailer.sendMail({
        to: event.payload.userEmail,
        subject: "Recuperação de senha",
        html,
      })
    } catch (error) {
      console.error("[SendPasswordResetEmailNotification]", error)
    }
  }
}
```

- [ ] **Step 4: Registrar no `user-module.ts`**

Abra `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, adicione o import:

```ts
import { SendPasswordResetEmailNotification } from "@/user/infra/email/send-password-reset-email.notification"
```

E dentro do `ContainerModule`, no bloco de notificações:

```ts
bind(USER_TYPES.Notifications.SendPasswordResetEmail)
  .to(SendPasswordResetEmailNotification)
  .inSingletonScope()
```

- [ ] **Step 5: Atualizar o bootstrap `setup-user-module.ts`**

Abra `apps/backend/src/bootstrap/setup-user-module.ts`. Adicione o import:

```ts
import type { SendPasswordResetEmailNotification } from "@/user/infra/email/send-password-reset-email.notification"
```

E dentro da função `setupUserModule()`, após as subscriptions existentes:

```ts
const passwordResetEmail = resolve<SendPasswordResetEmailNotification>(
  USER_TYPES.Notifications.SendPasswordResetEmail,
)
passwordResetEmail.subscribe()
```

O arquivo completo deve ficar assim:

```ts
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { SendPasswordAlertEmailNotification } from "@/user/infra/email/send-password-alert-email.notification"
import type { SendPasswordResetEmailNotification } from "@/user/infra/email/send-password-reset-email.notification"
import type { SendWelcomeEmailNotification } from "@/user/infra/email/send-welcome-email.notification"
import { type ModuleControllers, resolve } from "./server-build"

export function setupUserModule(): ModuleControllers {
  const welcomeEmail = resolve<SendWelcomeEmailNotification>(
    USER_TYPES.Notifications.SendWelcomeEmail,
  )
  welcomeEmail.subscribe()

  const passwordAlertEmail = resolve<SendPasswordAlertEmailNotification>(
    USER_TYPES.Notifications.SendPasswordAlertEmail,
  )
  passwordAlertEmail.subscribe()

  const passwordResetEmail = resolve<SendPasswordResetEmailNotification>(
    USER_TYPES.Notifications.SendPasswordResetEmail,
  )
  passwordResetEmail.subscribe()

  const controllers = [
    resolve(USER_TYPES.Controllers.CreateUser),
    resolve(USER_TYPES.Controllers.UserProfile),
    resolve(USER_TYPES.Controllers.UpdateUserProfile),
    resolve(USER_TYPES.Controllers.MyProfile),
    resolve(USER_TYPES.Controllers.UserMetrics),
    resolve(AUTH_TYPES.Controllers.RefreshToken),
    resolve(USER_TYPES.Controllers.ChangePassword),
    resolve(USER_TYPES.Controllers.CreatePasswordReauthGrant),
    resolve(USER_TYPES.Controllers.DefinePassword),
    resolve(USER_TYPES.Controllers.FetchUsers),
    resolve(USER_TYPES.Controllers.ActivateUser),
    resolve(USER_TYPES.Controllers.SuspendUser),
    resolve(USER_TYPES.Controllers.ForgotPassword),   // será adicionado na Task 6
    resolve(USER_TYPES.Controllers.ResetPassword),    // será adicionado na Task 6
  ]
  return { controllers }
}
```

**Nota:** Os dois `resolve()` dos novos controllers (`ForgotPassword` e `ResetPassword`) só vão funcionar após a Task 6. Adicione-os agora para que o arquivo não precise ser editado duas vezes.

- [ ] **Step 6: Verificar TypeScript**

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/user/infra/email/templates/password-reset-email.template.tsx \
        apps/backend/src/user/infra/email/send-password-reset-email.notification.ts \
        apps/backend/src/shared/infra/ioc/module/user/user-module.ts \
        apps/backend/src/bootstrap/setup-user-module.ts
git commit -m "feat(user): add password reset email template and notification

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- RF-014: template contém `name`, link de reset com `rawToken`, e aviso de expiração (15 min)
- RF-015: template contém aviso de segurança "Se você não solicitou..."
- RF-016: template usa `@react-email/components` (HTML) com prop `resetLink`, `name`, `email`
- `FRONTEND_URL` env var adicionada com default `http://localhost:3000`
- `SendPasswordResetEmailNotification.subscribe()` chamado no bootstrap
- `pnpm tsc:check` sem erros
