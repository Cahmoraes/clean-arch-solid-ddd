# Task 3: Publicar PasswordChangedEvent via DomainEventPublisher no DefinePasswordUseCase [RF-005]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-user-email-notifications.md`
**Spec:** `../specs/user-email-notifications-design.md`

## Visão Geral

`DefinePasswordUseCase.handlePasswordChangedEvent` atualmente publica o evento apenas na fila (queue). Para que o subscriber de email possa escutar via `DomainEventPublisher`, é necessário adicionar `DomainEventPublisher.instance.publish(event)` nesse método. A publicação na queue continua existindo (não é removida).

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/define-password.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/define-password.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: publicar no DomainEventPublisher na fonte do evento, não criar interceptadores artificiais

## Passos

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final do describe em `apps/backend/src/user/application/use-case/define-password.usecase.test.ts`:

```typescript
  test("deve publicar PasswordChangedEvent via DomainEventPublisher ao definir senha", async () => {
    const { DomainEventPublisher } = await import(
      "@/shared/domain/event/domain-event-publisher"
    )
    const { PasswordChangedEvent } = await import(
      "@/user/domain/event/password-changed-event"
    )

    const user = await createAndSaveUser({
      userRepository,
      email: "google-only@doe.com",
      googleId: "google-sub-123",
    })
    await cacheDB.set(
      "password-reauth:grant-domain-pub",
      { userId: user.id, provider: "google" },
      300,
    )

    let receivedEvent: InstanceType<typeof PasswordChangedEvent> | null = null
    const subscriber = (event: InstanceType<typeof PasswordChangedEvent>) => {
      receivedEvent = event
    }
    DomainEventPublisher.instance.subscribe("passwordChanged", subscriber)

    await sut.execute({
      userId: user.id,
      provider: "google",
      reauthGrant: "grant-domain-pub",
      newRawPassword: "Senha123!",
    })

    DomainEventPublisher.instance.unsubscribe("passwordChanged", subscriber)

    expect(receivedEvent).not.toBeNull()
    expect((receivedEvent as any).payload.userEmail).toBe("google-only@doe.com")
  })
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/backend && pnpm test:run -- -t "deve publicar PasswordChangedEvent via DomainEventPublisher"
```

Esperado: FAIL — `expect(received).not.toBeNull()` onde `received` é `null`

- [ ] **Step 3: Atualizar `handlePasswordChangedEvent` em `DefinePasswordUseCase`**

Localizar o método `handlePasswordChangedEvent` em `apps/backend/src/user/application/use-case/define-password.usecase.ts` e substituí-lo:

```typescript
  private handlePasswordChangedEvent(data: PasswordChangedEvent): void {
    const event = new PasswordChangedEvent({
      userEmail: data.payload.userEmail,
      userName: data.payload.userName,
    })
    void DomainEventPublisher.instance.publish(event)
    this.queue.publish(event.eventName, event)
  }
```

Também adicionar o import do `DomainEventPublisher` no topo do arquivo (após os imports existentes):

```typescript
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
```

- [ ] **Step 4: Rodar o teste novo para confirmar que passa**

```bash
cd apps/backend && pnpm test:run -- -t "deve publicar PasswordChangedEvent via DomainEventPublisher"
```

Esperado: PASS

- [ ] **Step 5: Rodar todos os testes para confirmar que nada quebrou**

```bash
cd apps/backend && pnpm test:run
```

Esperado: todos os testes passando

- [ ] **Step 6: Commit**

```bash
cd apps/backend && git add src/user/application/use-case/define-password.usecase.ts \
  src/user/application/use-case/define-password.usecase.test.ts
git commit -m "feat: publish PasswordChangedEvent via DomainEventPublisher

Enables email notification subscribers to listen to password change events.
Queue publication is preserved alongside the new DomainEventPublisher dispatch.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Subscribers do `DomainEventPublisher` recebem `PasswordChangedEvent` quando uma senha é definida (RF-005)
- A publicação na queue continua funcionando (testes existentes de queue passam)
- Todos os testes existentes continuam passando
