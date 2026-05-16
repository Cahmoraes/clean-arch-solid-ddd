# Task 2: Adicionar campo `name` ao UserCreatedEvent e atualizar CreateUserUseCase [RF-002]

**Status:** PENDING
**PRD:** `../prd/prd-user-email-notifications.md`
**Spec:** `../specs/user-email-notifications-design.md`

## Visão Geral

`UserCreatedEvent.payload` atualmente contém apenas `{ email }`. O email de boas-vindas precisa do nome do usuário. Esta task adiciona `name: string` ao payload do evento e atualiza `CreateUserUseCase.publishUserCreatedEvent` para passar o nome.

## Arquivos

- Modify: `apps/backend/src/user/domain/event/user-created-event.ts`
- Modify: `apps/backend/src/user/application/use-case/create-user.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/create-user.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: alterar o contrato do evento na fonte em vez de buscar o usuário no repositório dentro do subscriber

## Passos

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final de `apps/backend/src/user/application/use-case/create-user.usecase.test.ts`:

```typescript
  test("deve publicar UserCreatedEvent com name no payload", async () => {
    let receivedEvent: import("@/user/domain/event/user-created-event").UserCreatedEvent | null =
      null
    const subscriber = (
      event: import("@/user/domain/event/user-created-event").UserCreatedEvent,
    ) => {
      receivedEvent = event
    }
    const { DomainEventPublisher } = await import(
      "@/shared/domain/event/domain-event-publisher"
    )
    DomainEventPublisher.instance.subscribe("userCreated", subscriber)

    const input: CreateUserUseCaseInput = {
      name: "João Silva",
      email: "joao@example.com",
      password: "any_password",
    }
    await sut.execute(input)

    DomainEventPublisher.instance.unsubscribe("userCreated", subscriber)
    expect(receivedEvent).not.toBeNull()
    expect((receivedEvent as any).payload.name).toBe("João Silva")
  })
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/backend && pnpm test:run -- -t "deve publicar UserCreatedEvent com name"
```

Esperado: FAIL — `expect(received).toBe(expected)` onde `received` é `undefined`

- [ ] **Step 3: Atualizar `UserCreatedEvent`**

Substituir o conteúdo completo de `apps/backend/src/user/domain/event/user-created-event.ts`:

```typescript
import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface UserCreatedEventProps {
  email: string
  name: string
}

export class UserCreatedEvent extends DomainEvent<UserCreatedEventProps> {
  readonly payload: UserCreatedEventProps

  constructor(props: UserCreatedEventProps) {
    super(EVENTS.USER_CREATED)
    this.payload = props
  }

  public toJSON() {
    return {
      id: this.id,
      eventName: this.eventName,
      date: this.date,
      payload: this.payload,
    }
  }
}
```

- [ ] **Step 4: Atualizar `publishUserCreatedEvent` no `CreateUserUseCase`**

Localizar o método `publishUserCreatedEvent` em `apps/backend/src/user/application/use-case/create-user.usecase.ts` e substituí-lo:

```typescript
  private publishUserCreatedEvent(user: User): void {
    const event = new UserCreatedEvent({
      email: user.email,
      name: user.name,
    })
    DomainEventPublisher.instance.publish(event)
  }
```

- [ ] **Step 5: Rodar o teste novo para confirmar que passa**

```bash
cd apps/backend && pnpm test:run -- -t "deve publicar UserCreatedEvent com name"
```

Esperado: PASS

- [ ] **Step 6: Rodar todos os testes para confirmar que nada quebrou**

```bash
cd apps/backend && pnpm test:run
```

Esperado: todos os testes passando

- [ ] **Step 7: Commit**

```bash
cd apps/backend && git add src/user/domain/event/user-created-event.ts \
  src/user/application/use-case/create-user.usecase.ts \
  src/user/application/use-case/create-user.usecase.test.ts
git commit -m "feat: add name field to UserCreatedEvent payload

Required for welcome email personalization.
Updates CreateUserUseCase to pass user.name when publishing the event.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `UserCreatedEvent.payload.name` contém o nome do usuário cadastrado (RF-002)
- Todos os testes existentes continuam passando
