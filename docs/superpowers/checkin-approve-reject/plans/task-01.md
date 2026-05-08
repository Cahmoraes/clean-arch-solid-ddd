# Task 1: Erros de domínio e eventos [RF-005]

**Status:** DONE
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Criar o erro `CheckInAlreadyRejectedError`, o evento `CheckInRejectedEvent` e registrar o novo tipo de evento no enum `EVENTS`.

## Arquivos

- Create: `apps/backend/src/check-in/domain/error/check-in-already-rejected-error.ts`
- Create: `apps/backend/src/check-in/domain/event/check-in-rejected-event.ts`
- Modify: `apps/backend/src/shared/domain/event/events.ts`

## Passos

- [ ] **Step 1: Criar CheckInAlreadyRejectedError**

```typescript
// apps/backend/src/check-in/domain/error/check-in-already-rejected-error.ts
export class CheckInAlreadyRejectedError extends Error {
	constructor() {
		super("Check-in already rejected")
		this.name = "CheckInAlreadyRejectedError"
	}
}
```

- [ ] **Step 2: Adicionar CHECK_IN_REJECTED ao enum de eventos**

Arquivo: `apps/backend/src/shared/domain/event/events.ts`

```typescript
export const EVENTS = {
	USER_CREATED: "userCreated",
	PASSWORD_CHANGED: "passwordChanged",
	CHECK_IN_CREATED: "checkInCreated",
	CHECK_IN_REJECTED: "checkInRejected",
	USER_PROFILE_UPDATED: "userProfileUpdated",
	USER_ASSIGNED_BILLING_CUSTOMER_ID: "userAssignedBillingCustomerID",
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
```

- [ ] **Step 3: Criar CheckInRejectedEvent**

```typescript
// apps/backend/src/check-in/domain/event/check-in-rejected-event.ts
import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface CheckInRejectedEventProps {
	checkInId: string
	userId: string
	gymId: string
}

export class CheckInRejectedEvent extends DomainEvent<CheckInRejectedEventProps> {
	payload: CheckInRejectedEventProps

	constructor(props: CheckInRejectedEventProps) {
		super(EVENTS.CHECK_IN_REJECTED)
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

- [ ] **Step 4: Rodar testes para garantir que nada quebrou**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
cd apps/backend
git add src/check-in/domain/error/check-in-already-rejected-error.ts \
        src/check-in/domain/event/check-in-rejected-event.ts \
        src/shared/domain/event/events.ts
git commit -m "feat(check-in): add CheckInAlreadyRejectedError and CheckInRejectedEvent
```

## Critérios de Sucesso

- `CheckInAlreadyRejectedError` herda de `Error`, tem `name = "CheckInAlreadyRejectedError"` e mensagem `"Check-in already rejected"`
- `CheckInRejectedEvent` segue exatamente o padrão de `CheckInCreatedEvent`
- `EVENTS.CHECK_IN_REJECTED` existe no enum
- Todos os testes existentes continuam passando
