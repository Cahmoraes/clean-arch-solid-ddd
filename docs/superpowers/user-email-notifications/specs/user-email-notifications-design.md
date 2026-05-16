---
created_at: "2026-05-16T15:29:54-03:00"
updated_at: "2026-05-16T15:29:54-03:00"
---

# Design: Notificações por Email ao Usuário

## Visão Geral

Adicionar envio automático de emails transacionais para o usuário em dois momentos do ciclo de vida da conta:

1. **Cadastro** (`UserCreatedEvent`) → email de boas-vindas simples
2. **Definição de senha** (`PasswordChangedEvent`) → alerta de segurança

A implementação se apoia na infraestrutura de email já existente (`MailerGateway`, `NodeMailerAdapter`, `MailerGatewayMemory`) e no padrão de domain events (`DomainEventPublisher`) já adotado no projeto. Nenhum use case ou evento de domínio existente será modificado.

---

## Arquitetura

### Fluxo de dados

```
CreateUserUseCase
  └─ DomainEventPublisher.publish(UserCreatedEvent)
        └─ SendWelcomeEmailSubscriber.handle(event)
              └─ WelcomeEmailTemplate.render({ name, email })
              └─ MailerGateway.send({ to, subject, html })

DefinePasswordUseCase
  └─ DomainEventPublisher.publish(PasswordChangedEvent)
        └─ SendPasswordAlertEmailSubscriber.handle(event)
              └─ PasswordAlertEmailTemplate.render({ name, email })
              └─ MailerGateway.send({ to, subject, html })
```

### Novos arquivos

```
src/user/infra/
  email/
    templates/
      welcome-email.template.tsx
      password-alert-email.template.tsx
    subscribers/
      send-welcome-email.subscriber.ts
      send-password-alert-email.subscriber.ts
```

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `src/user/infra/ioc/module/user/user-types.ts` | Novos símbolos IoC para os dois subscribers |
| `src/user/infra/ioc/module/user/user-container.ts` | Bindings dos subscribers como singletons |
| `src/bootstrap/setup-user-module.ts` | Inscrição dos subscribers no `DomainEventPublisher` |
| `src/shared/infra/gateway/mailer-gateway-memory.ts` | Adicionar `sentEmails[]` para inspeção em testes (se ausente) |
| `.env.example` | Novas variáveis SMTP |

---

## Componentes

### Subscribers de Domain Event

Cada subscriber implementa `DomainEventSubscriber<T>` (interface existente), é decorado com `@injectable()` e recebe `MailerGateway` via injeção de dependência.

**Regra de erro:** o subscriber envolve toda a lógica de envio em `try/catch`. Erros de SMTP são logados (`console.error`) e nunca relançados, garantindo que uma falha de email nunca interrompa o cadastro ou a definição de senha do usuário.

```typescript
@injectable()
export class SendWelcomeEmailSubscriber
  implements DomainEventSubscriber<UserCreatedEvent> {

  constructor(
    @inject(InfraTypes.MailerGateway)
    private readonly mailer: MailerGateway,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    try {
      const html = await renderAsync(WelcomeEmailTemplate, {
        name: event.payload.name,
        email: event.payload.email,
      })
      await this.mailer.send({
        to: event.payload.email,
        subject: 'Bem-vindo(a)!',
        html,
      })
    } catch (error) {
      console.error('[SendWelcomeEmailSubscriber]', error)
    }
  }
}
```

O `SendPasswordAlertEmailSubscriber` segue o mesmo padrão, inscrito em `PasswordChangedEvent`.

### Templates React Email

Componentes React compilados para HTML via `renderAsync()` do `@react-email/render`. Cada template recebe `{ name, email }` como props.

**Welcome Email** — boas-vindas simples, confirma criação da conta, sem link de verificação.

**Password Alert Email** — alerta de segurança informando que uma senha foi definida/alterada, com orientação para contato caso o usuário não reconheça a ação.

Ambos os templates geram HTML responsivo com fallback `text/plain`.

### Registro no IoC e Bootstrap

Subscribers registrados como singletons em `user-container.ts` e inscritos no `DomainEventPublisher` durante o bootstrap em `setup-user-module.ts`:

```typescript
// setup-user-module.ts
DomainEventPublisher.instance.subscribe(
  UserCreatedEvent.name,
  container.get(UserTypes.SendWelcomeEmailSubscriber),
)
DomainEventPublisher.instance.subscribe(
  PasswordChangedEvent.name,
  container.get(UserTypes.SendPasswordAlertEmailSubscriber),
)
```

---

## Configuração SMTP

Novas variáveis de ambiente adicionadas ao `.env.example`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=secret
SMTP_FROM="Minha App <noreply@example.com>"
```

O `NodeMailerAdapter` existente será atualizado para ler essas variáveis em vez de usar a conta de teste Ethereal hardcoded. Em ambiente de teste, `MailerGatewayMemory` continua sendo usado via rebind no container.

---

## Dependências

A instalar em `apps/backend`:

```bash
pnpm add @react-email/components @react-email/render react react-dom
pnpm add -D @types/react @types/react-dom
```

---

## Testes

### Unitários (`*.test.ts`)

Cada subscriber tem dois casos de teste obrigatórios:

1. **Happy path:** verificar que `MailerGatewayMemory.sentEmails` contém o email correto após o evento ser publicado.
2. **Error resilience:** verificar que o subscriber não lança erro quando o mailer rejeita a promise.

### Business Flow (`*.business-flow-test.ts`)

- `POST /users` → `MailerGatewayMemory.sentEmails` deve conter 1 email de boas-vindas para o email cadastrado.
- `POST /sessions/define-password` → `MailerGatewayMemory.sentEmails` deve conter 1 email de alerta para o email do usuário.

O `MailerGatewayMemory` é rebindado no container de teste via `container.rebindSync()` (padrão já adotado no projeto).

---

## Notas de Implementação

- **Payload dos eventos:** verificar durante a implementação se `UserCreatedEvent` e `PasswordChangedEvent` já incluem `name` e `email` no payload. Se não incluírem, o subscriber deverá injetar também o `UserRepository` para buscar os dados do usuário pelo `userId` presente no evento.
- **Interface `MailerGateway.send()`:** verificar se o campo `html` já faz parte do contrato da interface. Caso contrário, atualizar a interface e o `MailerGatewayMemory` antes de criar os subscribers.

---

## O que não muda

- `MailerGateway` (interface) — sem alterações
- `NodeMailerAdapter` — apenas configuração SMTP via env vars
- `UserCreatedEvent` / `PasswordChangedEvent` — sem alterações
- `CreateUserUseCase` / `DefinePasswordUseCase` — sem alterações
- Fluxo de login via Google — sem alterações
