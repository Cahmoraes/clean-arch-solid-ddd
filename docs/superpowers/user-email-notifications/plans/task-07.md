# Task 7: Registrar notificações no IoC container + bootstrap + configurar SMTP via env vars [RF-001, RF-005]

**Status:** PENDING
**PRD:** `../prd/prd-user-email-notifications.md`
**Spec:** `../specs/user-email-notifications-design.md`

## Visão Geral

Registrar `SendWelcomeEmailNotification` e `SendPasswordAlertEmailNotification` no container Inversify, ativá-las no bootstrap chamando `subscribe()`, e atualizar o `NodeMailerAdapter` para ler configuração SMTP de variáveis de ambiente (com fallback para conta Ethereal de desenvolvimento).

**Pré-requisito:** Tasks 5 e 6 devem estar concluídas.

## Arquivos

- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`
- Modify: `apps/backend/src/shared/infra/gateway/node-mailer-adapter.ts`
- Modify: `apps/backend/.env.example`

### Conformidade com as Skills Padrão

- no-workarounds: registrar como singleton para garantir que a mesma instância que faz o subscribe é usada em produção

## Passos

- [ ] **Step 1: Adicionar símbolos IoC para as notificações**

Editar `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts` adicionando a seção `Notifications` antes do `} as const`:

```typescript
export const USER_TYPES = {
  Repositories: {
    User: Symbol.for("UserRepository"),
  },
  PG: {
    User: Symbol.for("PgUserRepository"),
  },
  UseCases: {
    CreateUser: Symbol.for("CreateUserUseCase"),
    UpdateUser: Symbol.for("UpdateUserUseCase"),
    DeleteUser: Symbol.for("DeleteUserUseCase"),
    FetchUsers: Symbol.for("FetchUsersUseCase"),
    UserProfile: Symbol.for("UserProfileUseCase"),
    ChangePassword: Symbol.for("ChangePasswordUseCase"),
    CreatePasswordReauthGrant: Symbol.for("CreatePasswordReauthGrantUseCase"),
    DefinePassword: Symbol.for("DefinePasswordUseCase"),
    ActivateUser: Symbol.for("ActivateUserUseCase"),
    UpdateUserProfile: Symbol.for("UpdateUserProfileUseCase"),
    SuspendUser: Symbol.for("SuspendUserUseCase"),
    UserMetrics: Symbol.for("UserMetricsUseCase"),
  },
  Controllers: {
    CreateUser: Symbol.for("UserController"),
    UserProfile: Symbol.for("UserProfileController"),
    ChangePassword: Symbol.for("ChangePasswordController"),
    CreatePasswordReauthGrant: Symbol.for(
      "CreatePasswordReauthGrantController",
    ),
    DefinePassword: Symbol.for("DefinePasswordController"),
    FetchUsers: Symbol.for("FetchUsersController"),
    UpdateUserProfile: Symbol.for("UpdateUserProfileController"),
    ActivateUser: Symbol.for("ActivateUserController"),
    SuspendUser: Symbol.for("SuspendUserController"),
    MyProfile: Symbol.for("MyProfileController"),
    UserMetrics: Symbol.for("UserMetricsController"),
  },
  DAO: {
    User: Symbol.for("UserDAO"),
  },
  Notifications: {
    SendWelcomeEmail: Symbol.for("SendWelcomeEmailNotification"),
    SendPasswordAlertEmail: Symbol.for("SendPasswordAlertEmailNotification"),
  },
} as const
```

- [ ] **Step 2: Registrar as notificações no container**

Editar `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`:

Adicionar os imports no topo (junto aos imports existentes):

```typescript
import { SendPasswordAlertEmailNotification } from "@/user/infra/email/send-password-alert-email.notification"
import { SendWelcomeEmailNotification } from "@/user/infra/email/send-welcome-email.notification"
```

Adicionar os bindings dentro do `ContainerModule`, antes do `bind(SQLiteUserRepository).toSelf()`:

```typescript
  bind(USER_TYPES.Notifications.SendWelcomeEmail)
    .to(SendWelcomeEmailNotification)
    .inSingletonScope()
  bind(USER_TYPES.Notifications.SendPasswordAlertEmail)
    .to(SendPasswordAlertEmailNotification)
    .inSingletonScope()
```

- [ ] **Step 3: Ativar as notificações no bootstrap**

Editar `apps/backend/src/bootstrap/setup-user-module.ts`:

Adicionar imports no topo:

```typescript
import type { SendWelcomeEmailNotification } from "@/user/infra/email/send-welcome-email.notification"
import type { SendPasswordAlertEmailNotification } from "@/user/infra/email/send-password-alert-email.notification"
```

Substituir o conteúdo da função `setupUserModule`:

```typescript
export function setupUserModule(): ModuleControllers {
  const welcomeEmail = resolve<SendWelcomeEmailNotification>(
    USER_TYPES.Notifications.SendWelcomeEmail,
  )
  welcomeEmail.subscribe()

  const passwordAlertEmail = resolve<SendPasswordAlertEmailNotification>(
    USER_TYPES.Notifications.SendPasswordAlertEmail,
  )
  passwordAlertEmail.subscribe()

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
  ]
  return { controllers }
}
```

- [ ] **Step 4: Atualizar `NodeMailerAdapter` para usar variáveis de ambiente SMTP**

Substituir o método `init` em `apps/backend/src/shared/infra/gateway/node-mailer-adapter.ts`:

```typescript
  @LoggerDecorate({
    message: "✅",
  })
  private async init(): Promise<void> {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    } else {
      const testAccount = await nodemailer.createTestAccount()
      this.transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
    }
  }
```

Também substituir a construção de `mailOptions` dentro de `sendMail` para usar `SMTP_FROM`:

```typescript
    const mailOptions = {
      from: process.env.SMTP_FROM ?? '"No Reply" <no-reply@test.com>',
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }
```

- [ ] **Step 5: Adicionar variáveis SMTP ao `.env.example`**

Abrir `apps/backend/.env.example` e adicionar ao final:

```env
# Email (SMTP)
# Deixe vazio para usar conta Ethereal de teste (desenvolvimento)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="No Reply <noreply@seudominio.com>"
```

- [ ] **Step 6: Verificar checagem de tipos**

```bash
cd apps/backend && pnpm tsc:check
```

Esperado: zero erros

- [ ] **Step 7: Rodar todos os testes**

```bash
cd apps/backend && pnpm test:run
```

Esperado: todos os testes passando (incluindo os das tasks anteriores)

- [ ] **Step 8: Verificar lint**

```bash
cd apps/backend && pnpm biome:fix
```

Esperado: zero problemas

- [ ] **Step 9: Build de produção**

```bash
cd apps/backend && pnpm build
```

Esperado: build concluído sem erros

- [ ] **Step 10: Commit**

```bash
cd apps/backend && git add \
  src/shared/infra/ioc/module/service-identifier/user-types.ts \
  src/shared/infra/ioc/module/user/user-module.ts \
  src/bootstrap/setup-user-module.ts \
  src/shared/infra/gateway/node-mailer-adapter.ts \
  .env.example
git commit -m "feat: wire email notifications in IoC container and bootstrap

- Register SendWelcomeEmailNotification and SendPasswordAlertEmailNotification
  as singletons in the user container
- Subscribe both notifications in setupUserModule bootstrap
- Update NodeMailerAdapter to read SMTP config from env vars
  (falls back to Ethereal test account when SMTP_HOST is not set)
- Add SMTP env vars to .env.example

Completes: RF-001, RF-005

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `SendWelcomeEmailNotification` inscrita no `DomainEventPublisher` ao iniciar a aplicação (RF-001)
- `SendPasswordAlertEmailNotification` inscrita no `DomainEventPublisher` ao iniciar a aplicação (RF-005)
- `NodeMailerAdapter` usa env vars SMTP quando `SMTP_HOST` está definido
- `pnpm tsc:check`, `pnpm test:run`, `pnpm biome:fix` e `pnpm build` passam com zero erros
