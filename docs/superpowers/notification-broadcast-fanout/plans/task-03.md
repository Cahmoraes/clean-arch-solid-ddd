# Task 3: Adicionar exchange `NOTIFICATION_BROADCAST` e novos symbols Inversify [FR-009]

**Status:** PENDING
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Adicionar a constante de exchange `NOTIFICATION_BROADCAST` (`"notificationBroadcast"`) ao registro
central de exchanges, e os dois novos symbols Inversify (`NotificationBroadcastPublisher`,
`NotificationBroadcastSubscriber`) ao bloco `Infra` de `notification-types.ts`, preparando o terreno
para as Tasks 4 e 6. Os symbols `RedisNotificationPublisher`/`RedisNotificationSubscriber`
permanecem intactos por enquanto — serão removidos apenas na Task 8, depois que as Tasks 4-7
pararem de depender deles.

## Arquivos

- Modify: `apps/backend/src/shared/infra/queue/exchanges.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`
- Test (novo): `apps/backend/src/shared/infra/queue/exchanges.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: tipo derivado via `as const` e `(typeof EXCHANGES)[keyof typeof EXCHANGES]`.
- `no-workarounds`: a nova exchange e os novos symbols devem seguir exatamente o padrão já existente
  no arquivo, sem atalhos.

## Passos

- **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest"
import { EXCHANGES } from "./exchanges"

describe("EXCHANGES", () => {
	it("should include NOTIFICATION_BROADCAST", () => {
		expect(EXCHANGES.NOTIFICATION_BROADCAST).toBe("notificationBroadcast")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:run -- -t "EXCHANGES"`
Expected: FAIL (`NOTIFICATION_BROADCAST` undefined).

- **Step 3: Write minimal implementation**

Em `exchanges.ts`:

```typescript
export const EXCHANGES = {
	LOG: "log",
	USER_CREATED: "userCreated",
	PASSWORD_CHANGED: "passwordChanged",
	CHECK_IN_CREATED: "checkInCreated",
	STRIPE_WEBHOOK: "stripeWebhook",
	RATE_LIMIT_EXCEEDED: "rateLimitExceeded",
	NOTIFICATION_CREATED: "notificationCreated",
	NOTIFICATION_BROADCAST: "notificationBroadcast",
} as const

export type ExchangeTypes = (typeof EXCHANGES)[keyof typeof EXCHANGES]
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend test:run -- -t "EXCHANGES"`
Expected: PASS.

- **Step 5: Adicionar os novos symbols Inversify (sem teste dedicado)**

Em `notification-types.ts`, no bloco `Infra` (validado indiretamente por `tsc:check` e pelas Tasks
4/6 que os consomem):

```typescript
Infra: {
	SseManager: Symbol.for("SseManager"),
	RedisNotificationPublisher: Symbol.for("RedisNotificationPublisher"),
	RedisNotificationSubscriber: Symbol.for("RedisNotificationSubscriber"),
	NotificationQueueWorker: Symbol.for("NotificationQueueWorker"),
	NotificationBroadcastPublisher: Symbol.for("NotificationBroadcastPublisher"),
	NotificationBroadcastSubscriber: Symbol.for("NotificationBroadcastSubscriber"),
},
```

- **Step 6: Verificar tipos**

Run: `pnpm --filter backend tsc:check`
Expected: PASS.

- **Step 7: Commit**

```bash
git add apps/backend/src/shared/infra/queue/exchanges.ts apps/backend/src/shared/infra/queue/exchanges.test.ts apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts
git commit -m "feat(notification): adiciona exchange notificationBroadcast e symbols Inversify"
```

## Critérios de Sucesso

- Teste novo passa.
- `tsc:check` limpo.
- `EXCHANGES.NOTIFICATION_BROADCAST === "notificationBroadcast"`.
