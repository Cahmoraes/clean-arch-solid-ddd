# Task 3: Provedor de destinatários ativos [FR-011, FR-012]

**Status:** DONE
**Verified:** `pnpm --filter backend test:run` → exit 0
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Cria a porta `ActiveRecipientsProvider` no contexto `notification` (application), a implementação `PrismaActiveRecipientsProvider` (infra) e o `InMemoryActiveRecipientsProvider` (com `userIds` público para seed em testes). "Ativo" é `UserStatus = activated` (D4 do spec); suspensos e bloqueados ficam de fora. O provider não filtra o remetente: o administrador que envia o aviso também é usuário ativo e recebe (FR-012). O contexto `notification` não importa `@/user/...`: a consulta Prisma usa `SHARED_TYPES.Prisma.Client` diretamente. O registro no IoC é feito na task 5.

## Arquivos

- Create: `apps/backend/src/notification/application/provider/active-recipients.provider.ts`
- Create: `apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.ts`
- Create: `apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.ts`
- Test: `apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts`
- Test: `apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: a regra de "ativo" vive em uma consulta explícita no provider; nada de filtrar em memória depois de carregar todos os usuários.
- `test-antipatterns`: o teste Prisma cria usuários reais em cada status e verifica o resultado do provider real; o in-memory tem teste próprio para não virar dublê sem contrato.

## Passos

- **Step 1: Write the failing test (Prisma e2e, três status)**

Pré-requisito: `pnpm --filter backend docker:up` com migrations aplicadas.

```ts
// apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts
import { randomUUID } from "node:crypto"
import { afterAll, afterEach, describe, expect, test } from "vitest"
import { PrismaActiveRecipientsProvider } from "@/notification/infra/provider/prisma/prisma-active-recipients.provider"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"

type UserStatusValue = "activated" | "suspended" | "locked"

const createdUserIds: string[] = []

async function createUser(status: UserStatusValue, deletedAt?: Date) {
	const id = randomUUID()
	createdUserIds.push(id)
	await prismaClient.user.create({
		data: {
			id,
			name: `Usuario ${status}`,
			email: `recipients-${id}@example.com`,
			password_hash: "hashed-password",
			role: "MEMBER",
			status,
			deleted_at: deletedAt ?? null,
		},
	})
	return id
}

describe("PrismaActiveRecipientsProvider", () => {
	const sut = new PrismaActiveRecipientsProvider(prismaClient)

	afterEach(async () => {
		await prismaClient.user.deleteMany({ where: { id: { in: createdUserIds } } })
		createdUserIds.length = 0
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	test("lista apenas usuarios activated e exclui suspended e locked", async () => {
		const activatedId = await createUser("activated")
		const suspendedId = await createUser("suspended")
		const lockedId = await createUser("locked")

		const ids = await sut.listActiveUserIds()

		expect(ids).toContain(activatedId)
		expect(ids).not.toContain(suspendedId)
		expect(ids).not.toContain(lockedId)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.integration.ts src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts`
Expected: FAIL - não foi possível resolver `prisma-active-recipients.provider` (módulo inexistente).

- **Step 3: Write minimal implementation (porta + Prisma + in-memory)**

```ts
// apps/backend/src/notification/application/provider/active-recipients.provider.ts
export interface ActiveRecipientsProvider {
	listActiveUserIds(): Promise<string[]>
}
```

```ts
// apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.ts
import { inject, injectable } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

@injectable()
export class PrismaActiveRecipientsProvider implements ActiveRecipientsProvider {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient,
	) {}

	public async listActiveUserIds(): Promise<string[]> {
		const users = await this.prismaClient.user.findMany({
			where: { status: "activated" },
			select: { id: true },
		})
		return users.map((user) => user.id)
	}
}
```

```ts
// apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.ts
import { injectable } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"

@injectable()
export class InMemoryActiveRecipientsProvider
	implements ActiveRecipientsProvider
{
	public userIds: string[] = []

	public async listActiveUserIds(): Promise<string[]> {
		return [...this.userIds]
	}
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.integration.ts src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts`
Expected: PASS (1 teste).

- **Step 5: Review Focus: Usuário `activated` removido (`deleted_at` preenchido) → não recebe o aviso. Write the failing test**

Review Focus: Usuário `activated` removido (`deleted_at` preenchido) → não recebe o aviso

Adicionar ao `describe` do arquivo de integração (o spec só nomeou o status; a exclusão lógica é a entrada implícita):

```ts
	test("Review Focus: usuario activated com deleted_at preenchido nao recebe o aviso", async () => {
		const activeId = await createUser("activated")
		const removedId = await createUser("activated", new Date())

		const ids = await sut.listActiveUserIds()

		expect(ids).toContain(activeId)
		expect(ids).not.toContain(removedId)
	})
```

- **Step 6: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.integration.ts src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts`
Expected: FAIL - `expected [...] not to include '<removedId>'`, porque a consulta do passo 3 só filtra `status`.

- **Step 7: Corrigir a consulta**

```ts
// prisma-active-recipients.provider.ts, dentro de listActiveUserIds()
		const users = await this.prismaClient.user.findMany({
			where: { status: "activated", deleted_at: null },
			select: { id: true },
		})
```

- **Step 8: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.integration.ts src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts`
Expected: PASS (2 testes).

- **Step 9: Teste do provider em memória**

```ts
// apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.test.ts
import { describe, expect, test } from "vitest"
import { InMemoryActiveRecipientsProvider } from "./in-memory-active-recipients.provider.js"

describe("InMemoryActiveRecipientsProvider", () => {
	test("comeca sem destinatarios", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		expect(await sut.listActiveUserIds()).toEqual([])
	})

	test("lista todos os ids semeados, incluindo o do administrador remetente", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["admin-1", "member-1"]
		expect(await sut.listActiveUserIds()).toEqual(["admin-1", "member-1"])
	})

	test("devolve copia: alterar o resultado nao altera o provider", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["member-1"]
		const ids = await sut.listActiveUserIds()
		ids.push("intruso")
		expect(await sut.listActiveUserIds()).toEqual(["member-1"])
	})
})
```

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.test.ts`
Expected: PASS (3 testes; o provider em memória foi criado no passo 3, este teste fixa seu contrato).

- **Step 10: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/backend/src/notification/application/provider apps/backend/src/notification/infra/provider
git commit -m "feat(notification): adiciona provedor de destinatarios ativos"
```

## Critérios de Sucesso

- `listActiveUserIds` devolve somente usuários `activated` e não removidos; `suspended`, `locked` e `deleted_at` preenchido ficam de fora (FR-011).
- Nenhum filtro exclui o remetente: o administrador ativo aparece na lista (FR-012).
- O contexto `notification` não importa `@/user/...`.
