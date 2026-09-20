# Task 2: Persistência em lote de notificações (saveMany) [FR-006]

**Status:** PENDING
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Adiciona `saveMany(notifications: Notification[]): Promise<void>` à porta `NotificationRepository`, à implementação em memória e à implementação Prisma. No Prisma, o lote grava uma linha em `notifications` e uma em `user_notifications` por notificação (`gymName` e `reason` nulos), dentro de uma única transação. O teste Prisma usa um tipo já existente (`PROMOTION`) para não depender da task 1.

## Arquivos

- Modify: `apps/backend/src/notification/application/repository/notification.repository.ts`
- Modify: `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts`
- Modify: `apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts`
- Test: `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.save-many.test.ts`
- Test: `apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.save-many.integration-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: a atomicidade do lote vem de `$transaction`, não de try/catch que engole erro de meio de lote.
- `test-antipatterns`: o teste Prisma consulta as tabelas reais (`notifications`, `user_notifications`); o teste em memória verifica o estado do repositório, sem mock do próprio repositório.
- `typescript-advanced`: o helper de transação estreita a união `PrismaClient | Prisma.TransactionClient` com o operador `in`, sem `as`.

## Passos

- **Step 1: Confirmar implementadores da porta e ambiente**

Run: `grep -rn "implements NotificationRepository" apps/backend/src`
Expected: exatamente duas classes: `InMemoryNotificationRepository` e `PrismaNotificationRepository`. Se aparecer outra, ela também precisa receber `saveMany` neste passo 3.

Pré-requisito do teste Prisma: `pnpm --filter backend docker:up` (PostgreSQL) com migrations aplicadas.

- **Step 2: Write the failing test (em memória)**

```ts
// apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.save-many.test.ts
import { beforeEach, describe, expect, test } from "vitest"
import { Notification } from "@/notification/domain/notification.js"
import { InMemoryNotificationRepository } from "./in-memory-notification.repository.js"

function makeNotification(userId: string, id?: string) {
	return Notification.create({
		id,
		userId,
		type: "PROMOTION",
		title: "Titulo",
		message: "Mensagem",
	})
}

describe("InMemoryNotificationRepository.saveMany", () => {
	let sut: InMemoryNotificationRepository

	beforeEach(() => {
		sut = new InMemoryNotificationRepository()
	})

	test("persiste todas as notificacoes do lote", async () => {
		const batch = [
			makeNotification("user-1"),
			makeNotification("user-2"),
			makeNotification("user-3"),
		]
		await sut.saveMany(batch)
		expect(sut.notifications.size).toBe(3)
		for (const notification of batch) {
			expect(await sut.findById(notification.id)).toBe(notification)
		}
	})

	test("substitui uma notificacao existente com o mesmo id", async () => {
		const original = makeNotification("user-1", "notif-1")
		const replacement = makeNotification("user-1", "notif-1")
		await sut.save(original)
		await sut.saveMany([replacement])
		expect(sut.notifications.size).toBe(1)
		expect(await sut.findById("notif-1")).toBe(replacement)
	})

	test("lote vazio nao altera o repositorio", async () => {
		await sut.saveMany([])
		expect(sut.notifications.size).toBe(0)
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/infra/repository/in-memory/in-memory-notification.repository.save-many.test.ts`
Expected: FAIL - `sut.saveMany is not a function`.

- **Step 4: Write minimal implementation (porta + em memória)**

```ts
// apps/backend/src/notification/application/repository/notification.repository.ts
export interface NotificationRepository {
	save(notification: Notification): Promise<SaveNotificationResponse>
	saveMany(notifications: Notification[]): Promise<void>
	findById(id: string): Promise<Notification | null>
	findManyByUserId(
		input: FindManyNotificationsInput,
	): Promise<FindManyNotificationsOutput>
	countUnreadByUserId(userId: string): Promise<number>
	markAllAsReadByUserId(userId: string): Promise<void>
}
```

```ts
// apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts
// logo abaixo de save()
	public async saveMany(notifications: Notification[]): Promise<void> {
		for (const notification of notifications) {
			await this.save(notification)
		}
	}
```

- **Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/infra/repository/in-memory/in-memory-notification.repository.save-many.test.ts`
Expected: PASS (3 testes).

- **Step 6: Write the failing test (Prisma e2e)**

```ts
// apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.save-many.integration-test.ts
import { randomUUID } from "node:crypto"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vitest"
import { Notification } from "@/notification/domain/notification"
import { PrismaNotificationRepository } from "@/notification/infra/repository/prisma/prisma-notification.repository"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"

async function createTestUser() {
	const userId = randomUUID()
	await prismaClient.user.create({
		data: {
			id: userId,
			name: "Test User",
			email: `test-${userId}@example.com`,
			password_hash: "hashed-password",
			role: "MEMBER",
			status: "activated",
		},
	})
	return userId
}

describe("PrismaNotificationRepository.saveMany", () => {
	let sut: PrismaNotificationRepository
	let userIds: string[]

	beforeEach(async () => {
		sut = new PrismaNotificationRepository(prismaClient)
		userIds = [await createTestUser(), await createTestUser(), await createTestUser()]
	})

	afterEach(async () => {
		await prismaClient.userNotification.deleteMany({
			where: { userId: { in: userIds } },
		})
		await prismaClient.notification.deleteMany({
			where: { userId: { in: userIds } },
		})
		await prismaClient.user.deleteMany({ where: { id: { in: userIds } } })
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	test("saveMany persiste N linhas com vinculo em user_notifications", async () => {
		const batch = userIds.map((userId) =>
			Notification.create({
				id: randomUUID(),
				userId,
				type: "PROMOTION",
				title: "Aviso em lote",
				message: "Mensagem em lote",
			}),
		)

		await sut.saveMany(batch)

		expect(
			await prismaClient.notification.count({
				where: { userId: { in: userIds } },
			}),
		).toBe(3)
		expect(
			await prismaClient.userNotification.count({
				where: { userId: { in: userIds } },
			}),
		).toBe(3)
		for (const notification of batch) {
			const row = await prismaClient.notification.findUniqueOrThrow({
				where: { id: notification.id },
				include: { userNotifications: true },
			})
			expect(row.gymName).toBeNull()
			expect(row.reason).toBeNull()
			expect(row.userNotifications).toHaveLength(1)
			expect(row.userNotifications[0]?.userId).toBe(notification.userId)
			expect(row.userNotifications[0]?.readAt).toBeNull()
			expect(row.userNotifications[0]?.deletedAt).toBeNull()
		}
	})

	test("cada usuario le a propria notificacao via findManyByUserId", async () => {
		const batch = userIds.map((userId) =>
			Notification.create({
				id: randomUUID(),
				userId,
				type: "PROMOTION",
				title: "Aviso em lote",
				message: "Mensagem em lote",
			}),
		)
		await sut.saveMany(batch)

		for (const userId of userIds) {
			const result = await sut.findManyByUserId({ userId, page: 1 })
			expect(result.total).toBe(1)
			expect(result.items[0]?.userId).toBe(userId)
			expect(result.items[0]?.readAt).toBeUndefined()
		}
	})

	test("lote vazio nao grava nada", async () => {
		await sut.saveMany([])
		expect(
			await prismaClient.notification.count({
				where: { userId: { in: userIds } },
			}),
		).toBe(0)
	})
})
```

- **Step 7: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.integration.ts src/notification/infra/repository/prisma/prisma-notification.repository.save-many.integration-test.ts`
Expected: FAIL - `sut.saveMany is not a function` nos dois primeiros testes; o de lote vazio também falha pelo mesmo motivo.

- **Step 8: Write minimal implementation (Prisma)**

```ts
// apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts
// logo abaixo de save()
	public async saveMany(notifications: Notification[]): Promise<void> {
		if (notifications.length === 0) return
		await this.runInTransaction(async (client) => {
			await client.notification.createMany({
				data: notifications.map((notification) => ({
					id: notification.id,
					userId: notification.userId,
					type: notification.type,
					title: notification.title,
					message: notification.message,
					gymName: notification.gymName ?? null,
					reason: notification.reason ?? null,
					createdAt: notification.createdAt,
					updatedAt: notification.updatedAt,
				})),
			})
			await client.userNotification.createMany({
				data: notifications.map((notification) => ({
					notificationId: notification.id,
					userId: notification.userId,
					readAt: notification.readAt ?? null,
					deletedAt: notification.deletedAt ?? null,
					createdAt: notification.createdAt,
					updatedAt: notification.updatedAt,
				})),
			})
		})
	}

	private runInTransaction(
		work: (client: Prisma.TransactionClient) => Promise<void>,
	): Promise<void> {
		if ("$transaction" in this.prismaClient) {
			return this.prismaClient.$transaction(work)
		}
		return work(this.prismaClient)
	}
```

Se o estreitamento por `in` não compilar no gate de typecheck, corrigir o helper na raiz (ex.: usar `PrismaUnitOfWork.isClientTransaction`, já importado no arquivo) em vez de recorrer a `as`.

- **Step 9: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.integration.ts src/notification/infra/repository/prisma/prisma-notification.repository.save-many.integration-test.ts`
Expected: PASS (3 testes).

- **Step 10: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/backend/src/notification/application/repository/notification.repository.ts apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.save-many.test.ts apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.save-many.integration-test.ts
git commit -m "feat(notification): adiciona saveMany ao repositorio de notificacoes"
```

## Critérios de Sucesso

- `saveMany` persiste N notificações; no Prisma, cada uma com uma linha em `notifications` (`gymName` e `reason` nulos) e uma em `user_notifications` (FR-006).
- Lote vazio é no-op, e o lote inteiro é gravado em uma única transação.
- Todas as classes que implementam `NotificationRepository` expõem `saveMany`.
