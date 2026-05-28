# Task 3: Domain event `AccountLockedBySecurityEvent` [RF-008, RF-009]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Registra o novo evento `ACCOUNT_LOCKED_BY_SECURITY` no registry de eventos e cria a classe `AccountLockedBySecurityEvent`. O payload inclui `userId`, `email`, `userName` e `resetToken` (token raw para construir o link de redefinição no e-mail).

## Arquivos

- Modify: `apps/backend/src/shared/domain/event/events.ts`
- Create: `apps/backend/src/user/domain/event/account-locked-by-security-event.ts`

### Conformidade com as Skills Padrão

- no-workarounds: evento tipado corretamente, sem `any` no payload

## Passos

- [ ] **Step 1: Adicionar `ACCOUNT_LOCKED_BY_SECURITY` ao registry de eventos**

Arquivo: `apps/backend/src/shared/domain/event/events.ts`

```typescript
export const EVENTS = {
  USER_CREATED: "userCreated",
  PASSWORD_CHANGED: "passwordChanged",
  PASSWORD_RESET_REQUESTED: "passwordResetRequested",
  CHECK_IN_CREATED: "checkInCreated",
  CHECK_IN_REJECTED: "checkInRejected",
  USER_PROFILE_UPDATED: "userProfileUpdated",
  USER_ASSIGNED_BILLING_CUSTOMER_ID: "userAssignedBillingCustomerID",
  GOOGLE_ACCOUNT_LINKED: "googleAccountLinked",
  ACCOUNT_LOCKED_BY_SECURITY: "accountLockedBySecurity",
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
```

- [ ] **Step 2: Criar `AccountLockedBySecurityEvent`**

Arquivo: `apps/backend/src/user/domain/event/account-locked-by-security-event.ts`

```typescript
import { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { EVENTS } from "@/shared/domain/event/events.js"

export interface AccountLockedBySecurityEventProps {
  userId: string
  userEmail: string
  userName: string
  resetToken: string
}

export class AccountLockedBySecurityEvent extends DomainEvent<AccountLockedBySecurityEventProps> {
  readonly payload: AccountLockedBySecurityEventProps

  constructor(props: AccountLockedBySecurityEventProps) {
    super(EVENTS.ACCOUNT_LOCKED_BY_SECURITY)
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

- [ ] **Step 3: Verificar que o TypeScript compila sem erros**

```bash
pnpm --filter backend tsc:check
```

Esperado: zero erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/shared/domain/event/events.ts \
        apps/backend/src/user/domain/event/account-locked-by-security-event.ts
git commit -m "feat(login-security-lockout): adicionar AccountLockedBySecurityEvent"
```

## Critérios de Sucesso

- `EVENTS.ACCOUNT_LOCKED_BY_SECURITY === "accountLockedBySecurity"` existe
- `AccountLockedBySecurityEvent` estende `DomainEvent<AccountLockedBySecurityEventProps>` com payload correto
- `tsc:check` passa sem erros [RF-008, RF-009]
