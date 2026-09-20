# Task 1: Tipo NOTICE no domínio, Prisma e schema do GET [FR-006]

**Status:** DONE
**Verified:** `pnpm --filter backend test:run` → exit 0
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

O tipo `NOTICE` precisa existir nos quatro lugares onde o enum `NotificationType` é duplicado no backend: tipo de domínio, `enum` do Prisma, migration SQL e zod do `GET /api/v1/notifications`. Para impedir drift futuro, esta task introduz uma lista única exportada (`NOTIFICATION_TYPE_VALUES`) da qual o tipo de domínio e o zod derivam, e um teste de contrato que compara essa lista com o enum gerado pelo Prisma. Não há novas tabelas: a única mudança de banco é `ALTER TYPE "NotificationType" ADD VALUE 'NOTICE'`.

## Arquivos

- Modify: `apps/backend/src/notification/domain/notification.ts`
- Create: `apps/backend/src/notification/infra/controller/schema/notification-type.schema.ts`
- Modify: `apps/backend/src/notification/infra/controller/get-notifications.controller.ts`
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260920180000_add_notice_notification_type/migration.sql`
- Test: `apps/backend/src/notification/domain/notification-type.contract.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: o drift do enum é resolvido na raiz (lista única + teste de contrato), sem cast nem supressão para fazer o tipo compilar.
- `test-antipatterns`: o teste de contrato exercita o enum real gerado pelo Prisma e o schema real do zod, sem mocks.
- `typescript-advanced`: `NotificationType` passa a ser derivado de `as const` (`(typeof NOTIFICATION_TYPE_VALUES)[number]`), e `z.enum` recebe a mesma tupla.

## Passos

- **Step 1: Write the failing test**

```ts
// apps/backend/src/notification/domain/notification-type.contract.test.ts
import { describe, expect, test } from "vitest"
import {
	NOTIFICATION_TYPE_VALUES,
	Notification,
} from "@/notification/domain/notification.js"
import { notificationTypeSchema } from "@/notification/infra/controller/schema/notification-type.schema.js"
import { $Enums } from "@/shared/infra/database/generated/prisma/client"

describe("contrato do enum NotificationType", () => {
	test("inclui o tipo NOTICE", () => {
		expect(NOTIFICATION_TYPE_VALUES).toContain("NOTICE")
	})

	test.each(NOTIFICATION_TYPE_VALUES)(
		"Notification.create aceita o tipo %s",
		(type) => {
			const notification = Notification.create({
				userId: "user-1",
				type,
				title: "Titulo",
				message: "Mensagem",
			})
			expect(notification.type).toBe(type)
		},
	)

	test.each(NOTIFICATION_TYPE_VALUES)(
		"o schema zod do GET aceita o tipo %s",
		(type) => {
			expect(notificationTypeSchema.safeParse(type).success).toBe(true)
		},
	)

	test("o enum do Prisma tem exatamente os valores do dominio", () => {
		expect(Object.values($Enums.NotificationType).sort()).toEqual(
			[...NOTIFICATION_TYPE_VALUES].sort(),
		)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/domain/notification-type.contract.test.ts`
Expected: FAIL - `notification-type.schema.js` não existe (falha de resolução do import) e `NOTIFICATION_TYPE_VALUES` não é exportado de `notification.ts`.

- **Step 3: Write minimal implementation**

3a. Domínio: substituir a union escrita à mão por uma lista única.

```ts
// apps/backend/src/notification/domain/notification.ts (topo do arquivo)
import { randomUUID } from "node:crypto"

export const NOTIFICATION_TYPE_VALUES = [
	"CHECK_IN_APPROVED",
	"CHECK_IN_REJECTED",
	"SECURITY_ALERT",
	"PROMOTION",
	"NOTICE",
] as const

export type NotificationType = (typeof NOTIFICATION_TYPE_VALUES)[number]
```

3b. Schema zod compartilhado do tipo:

```ts
// apps/backend/src/notification/infra/controller/schema/notification-type.schema.ts
import { z } from "zod"
import { NOTIFICATION_TYPE_VALUES } from "@/notification/domain/notification.js"

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPE_VALUES)
```

3c. `get-notifications.controller.ts`: importar `notificationTypeSchema` e trocar o `z.enum([...])` de `notificationItemSchema.type`.

```ts
import { notificationTypeSchema } from "./schema/notification-type.schema.js"

// dentro de notificationItemSchema
	type: notificationTypeSchema.meta({ description: "Notification type" }),
```

3d. `apps/backend/prisma/schema.prisma`: acrescentar o valor ao enum.

```prisma
enum NotificationType {
  CHECK_IN_APPROVED
  CHECK_IN_REJECTED
  SECURITY_ALERT
  PROMOTION
  NOTICE
}
```

3e. Migration (mesmo precedente de `20260528141648_add_locked_status_and_is_super_admin`):

```sql
-- apps/backend/prisma/migrations/20260920180000_add_notice_notification_type/migration.sql
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NOTICE';
```

3f. Regenerar o client Prisma (o client gerado em `src/shared/infra/database/generated/prisma` fica stale sem isso):

Run: `pnpm --filter backend prisma:generate`
Expected: saída do Prisma informando "Generated Prisma Client".

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/domain/notification-type.contract.test.ts`
Expected: PASS (todos os casos, incluindo o de igualdade com `$Enums.NotificationType`).

- **Step 5: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/backend/src/notification/domain/notification.ts apps/backend/src/notification/domain/notification-type.contract.test.ts apps/backend/src/notification/infra/controller/schema/notification-type.schema.ts apps/backend/src/notification/infra/controller/get-notifications.controller.ts apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/20260920180000_add_notice_notification_type/migration.sql
git commit -m "feat(notification): adiciona tipo NOTICE ao dominio, Prisma e schema do GET"
```

## Critérios de Sucesso

- `NOTICE` é aceito por `Notification.create`, pelo zod do `GET /api/v1/notifications` e existe no enum Prisma (migration `ALTER TYPE ... ADD VALUE 'NOTICE'`) (FR-006).
- O teste de contrato falha se qualquer um dos três lugares divergir da lista única `NOTIFICATION_TYPE_VALUES`.
- Nenhuma tabela nova é criada.
