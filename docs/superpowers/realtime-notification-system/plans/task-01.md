# Task 1: CheckInApprovedEvent + events.ts update [RF-020, RF-021]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** N/A

## Visão Geral

Criar o `CheckInApprovedEvent` (domínio do check-in), adicionar `CHECK_IN_APPROVED` ao enum `EVENTS`, e fazer `CheckInStatus.validate()` publicar o evento. Análogo ao `CheckInRejectedEvent` que já existe.

## Arquivos

- Create: `apps/backend/src/check-in/domain/event/check-in-approved-event.ts`
- Modify: `apps/backend/src/shared/domain/event/events.ts`
- Modify: `apps/backend/src/check-in/domain/value-object/check-in-status.ts`
- Test: `apps/backend/src/check-in/domain/value-object/check-in-status.test.ts` (arquivo pode não existir — criar)

### Conformidade com as Skills Padrão

- code-style: Factory method `create()` sync, extend `DomainEvent<T>`, CQS, DDD entity pattern

## Passos

### Passo 1: Escrever o teste que falha — CheckInApprovedEvent deve ser publicado após validate()

Arquivo: `apps/backend/src/check-in/domain/value-object/check-in-status.test.ts`

```ts
import { describe, expect, test, vi, afterEach } from "vitest"
import { CheckIn } from "@/check-in/domain/check-in"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { EVENTS } from "@/shared/domain/event/events"

describe("CheckInStatus.validate()", () => {
  afterEach(() => {
    // Reset subscribers between tests
    vi.restoreAllMocks()
  })

  test("should publish CheckInApprovedEvent after validate()", () => {
    const checkIn = CheckIn.create({
      id: "ci-1",
      gymId: "gym-1",
      userId: "user-1",
      userLatitude: 0,
      userLongitude: 0,
    })

    const publishSpy = vi.spyOn(DomainEventPublisher.instance, "publish")

    checkIn.validate()

    expect(publishSpy).toHaveBeenCalledOnce()
    const publishedEvent = publishSpy.mock.calls[0][0]
    expect(publishedEvent.eventName).toBe(EVENTS.CHECK_IN_APPROVED)
    expect((publishedEvent as any).payload).toEqual({
      checkInId: "ci-1",
      userId: "user-1",
      gymId: "gym-1",
    })
  })
})
```

### Passo 2: Executar o teste para confirmar falha

```bash
cd apps/backend
pnpm test:run -- -t "should publish CheckInApprovedEvent after validate"
```

Esperado: FAIL — `EVENTS.CHECK_IN_APPROVED` não existe / evento não publicado.

### Passo 3: Adicionar `CHECK_IN_APPROVED` a `events.ts`

Arquivo: `apps/backend/src/shared/domain/event/events.ts`

Adicionar a linha `CHECK_IN_APPROVED: "checkInApproved",`:

```ts
export const EVENTS = {
  USER_CREATED: "userCreated",
  PASSWORD_CHANGED: "passwordChanged",
  PASSWORD_RESET_REQUESTED: "passwordResetRequested",
  CHECK_IN_CREATED: "checkInCreated",
  CHECK_IN_REJECTED: "checkInRejected",
  CHECK_IN_APPROVED: "checkInApproved",
  USER_PROFILE_UPDATED: "userProfileUpdated",
  USER_ASSIGNED_BILLING_CUSTOMER_ID: "userAssignedBillingCustomerID",
  GOOGLE_ACCOUNT_LINKED: "googleAccountLinked",
  ACCOUNT_LOCKED_BY_SECURITY: "accountLockedBySecurity",
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
```

### Passo 4: Criar `check-in-approved-event.ts`

Arquivo: `apps/backend/src/check-in/domain/event/check-in-approved-event.ts`

```ts
import { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { EVENTS } from "@/shared/domain/event/events.js"

export interface CheckInApprovedEventProps {
  checkInId: string
  userId: string
  gymId: string
}

export class CheckInApprovedEvent extends DomainEvent<CheckInApprovedEventProps> {
  payload: CheckInApprovedEventProps

  constructor(props: CheckInApprovedEventProps) {
    super(EVENTS.CHECK_IN_APPROVED)
    this.payload = props
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.eventName,
      date: this.date,
      payload: this.payload,
    }
  }
}
```

### Passo 5: Publicar o evento em `CheckInStatus.validate()`

Arquivo: `apps/backend/src/check-in/domain/value-object/check-in-status.ts`

Localizar o método `validate()` na classe de estado `ValidatedCheckInStatus` (ou onde for a transição de validação). Adicionar o `publish` logo antes do `return success(true)`. O diff relevante:

```ts
// Adicionar imports no topo do arquivo (junto aos demais imports)
import { CheckInApprovedEvent } from "@/check-in/domain/event/check-in-approved-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
```

No método `validate()`, logo após `this.checkIn._changeStatus(...)`:

```ts
public validate(): Either<CheckInTimeExceededError, true> {
  if (this.checkIn._isNotEligibleToValidate()) {
    return failure(new CheckInTimeExceededError())
  }
  this.checkIn._setValidatedAt(new Date())
  this.checkIn._changeStatus(
    CheckInStatusFactory.create(this.checkIn, CheckInStatusTypes.VALIDATED),
  )
  DomainEventPublisher.instance.publish(
    new CheckInApprovedEvent({
      checkInId: this.checkIn.id,
      userId: this.checkIn.userId,
      gymId: this.checkIn.gymId,
    }),
  )
  return success(true)
}
```

### Passo 6: Executar o teste para confirmar que passa

```bash
cd apps/backend
pnpm test:run -- -t "should publish CheckInApprovedEvent after validate"
```

Esperado: PASS

### Passo 7: Executar suite completa de check-in para garantir nenhuma regressão

```bash
cd apps/backend
pnpm test:run -- apps/backend/src/check-in
```

Esperado: todos os testes passam.

### Passo 8: Type-check e lint

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

### Passo 9: Commit

```bash
cd apps/backend
git add \
  src/check-in/domain/event/check-in-approved-event.ts \
  src/shared/domain/event/events.ts \
  src/check-in/domain/value-object/check-in-status.ts \
  src/check-in/domain/value-object/check-in-status.test.ts
git commit -m "feat(check-in): add CheckInApprovedEvent published on validate()"
```

## Critérios de Sucesso

- `CheckInApprovedEvent` existe com payload `{ checkInId, userId, gymId }` [RF-020]
- `EVENTS.CHECK_IN_APPROVED = "checkInApproved"` existe [RF-020]
- `CheckInStatus.validate()` publica `CheckInApprovedEvent` após mudança de estado [RF-021]
- Todos os testes de check-in passam sem regressão
- `biome:fix` e `tsc:check` passam com zero issues
