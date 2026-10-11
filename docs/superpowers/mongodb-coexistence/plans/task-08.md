# Task 8: Repositório de notificação e provider de destinatários ativos no Mongo [FR-004, FR-009, FR-012]

**Status:** DONE

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task entrega `MongoNotificationRepository` e `MongoActiveRecipientsProvider`. As coleções `notifications` e `user_notifications` ficam separadas, como as tabelas, e toda gravação de uma `Notification` cria ou atualiza a `UserNotification` associada na mesma transação (o equivalente ao `create` aninhado e ao `createMany` duplo do Prisma). O provider resolve os destinatários ativos (`activated`, sem `deleted_at`) por público MEMBERS, ADMINS ou ALL. A task também cria as suítes de contrato do repositório e do provider.

## Arquivos

- Create: `apps/backend/src/notification/infra/repository/mongo/mongo-notification.repository.ts`
- Create: `apps/backend/src/notification/infra/provider/mongo/mongo-active-recipients.provider.ts`
- Create: `apps/backend/test/repository-contract/notification-repository-contract.ts`
- Create: `apps/backend/test/repository-contract/active-recipients-provider-contract.ts`
- Test: `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.contract.test.ts`
- Test: `apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.contract.integration-test.ts`
- Test: `apps/backend/src/notification/infra/repository/mongo/mongo-notification.repository.integration-test.ts`
- Test: `apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.contract.test.ts`
- Test: `apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.contract.integration-test.ts`
- Test: `apps/backend/src/notification/infra/provider/mongo/mongo-active-recipients.provider.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { collection<T extends Document>(name: string): Collection<T> }`, `COLLECTIONS.NOTIFICATIONS`, `COLLECTIONS.USER_NOTIFICATIONS`, `COLLECTIONS.USERS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
  - `SHARED_TYPES.Mongo.Connection` de `@/shared/infra/ioc/types` (task-02)
  - `MongoUnitOfWork.isClientSession(obj: unknown): obj is ClientSession`, `new MongoUnitOfWork(connection)` e `runTransaction` (task-03)
  - `sessionOptions(session: ClientSession | undefined): { session?: ClientSession }` e `runInTransaction<T>(connection: MongoConnection, current: ClientSession | undefined, work: (session: ClientSession) => Promise<T>): Promise<T>` de `@/shared/infra/database/repository/unit-of-work/mongo-session` (task-03)
  - `type UserDocument` de `@/shared/infra/database/repository/mongo/mongo-user-repository` (task-04)
  - `class IdRecorder { newId(): string; get ids(): readonly string[] }` de `test/repository-contract/id-recorder` e `deleteDocumentsReferencing(connection, ids, targets)` de `test/mongo/delete-documents-referencing` (task-04)
  - `class PrismaReferenceSeeder { ensureUsers(ids: readonly string[]): Promise<void>; cleanup(): Promise<void> }` de `test/repository-contract/prisma-reference-seeder` (task-06)
- **Produz:**
  - `class MongoNotificationRepository implements NotificationRepository` (`@injectable()`, construtor `(connection: MongoConnection)`, mais `withTransaction<TX extends object>(tx: TX): NotificationRepository`), `type NotificationDocument`, `type UserNotificationDocument` em `@/notification/infra/repository/mongo/mongo-notification.repository`
  - `class MongoActiveRecipientsProvider implements ActiveRecipientsProvider` (`@injectable()`, construtor `(connection: MongoConnection)`) em `@/notification/infra/provider/mongo/mongo-active-recipients.provider`
  - `describeNotificationRepositoryContract(name: string, factory: () => Promise<NotificationRepositoryContractContext>): void` com `interface NotificationRepositoryContractContext { repository: NotificationRepository; newId(): string; ensureReferences(references: { userIds: string[] }): Promise<void>; cleanup(): Promise<void> }` em `test/repository-contract/notification-repository-contract`
  - `describeActiveRecipientsProviderContract(name: string, factory: () => Promise<ActiveRecipientsProviderContractContext>): void` com `interface ActiveRecipientsProviderContractContext { provider: ActiveRecipientsProvider; seed(users: RecipientSeedUser[]): Promise<void>; newId(): string; cleanup(): Promise<void> }` e `interface RecipientSeedUser { id: string; role: "MEMBER" | "ADMIN"; status: StatusTypes; deleted: boolean }` em `test/repository-contract/active-recipients-provider-contract`
  - Convenção dos documentos: `notifications` (`_id`, `user_id`, `type`, `title`, `message`, `gym_name`, `reason`, `created_at`, `updated_at`); `user_notifications` (`_id` UUID gerado, `notification_id`, `user_id`, `read_at`, `deleted_at`, `created_at`, `updated_at`)

### Skills a invocar

- `typescript-advanced`: documentos como `type` alias, resultado do `$lookup` tipado como `UserNotificationDocument & { notification: NotificationDocument }` e `NoticeAudience` tratado por `switch` exaustivo sem `default`.
- `no-workarounds`: a atomicidade de `Notification` mais `UserNotification` vem de `runInTransaction`, não de uma segunda gravação "compensatória"; a exclusão em cascata não tem caminho de código e fica fora desta task (ver INV-05 na task do ETL).
- `test-antipatterns`: a atomicidade é provada provocando uma falha real (id duplicado em `saveMany`) e lendo as duas coleções depois; nada de mock do driver.

## Passos

- **Step 1: Write the failing tests (contracts and Mongo specifics)**

`apps/backend/test/repository-contract/notification-repository-contract.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { Notification } from "@/notification/domain/notification.js"

export interface NotificationRepositoryContractContext {
	repository: NotificationRepository
	newId(): string
	ensureReferences(references: { userIds: string[] }): Promise<void>
	cleanup(): Promise<void>
}

export type NotificationProps = Parameters<typeof Notification.restore>[0]

export function buildNotificationProps(
	id: string,
	userId: string,
	overrides: Partial<NotificationProps> = {},
): NotificationProps {
	return {
		id,
		userId,
		type: "NOTICE",
		title: "Contract notice",
		message: "Mensagem de contrato",
		createdAt: new Date("2026-05-10T12:00:00.000Z"),
		updatedAt: new Date("2026-05-10T12:00:00.000Z"),
		...overrides,
	}
}

export function describeNotificationRepositoryContract(
	name: string,
	factory: () => Promise<NotificationRepositoryContractContext>,
): void {
	describe(`NotificationRepository contract (${name})`, () => {
		let context: NotificationRepositoryContractContext
		let userId: string

		beforeEach(async () => {
			context = await factory()
			userId = context.newId()
			await context.ensureReferences({ userIds: [userId] })
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function build(overrides: Partial<NotificationProps> = {}): Notification {
			const id = overrides.id ?? context.newId()
			return Notification.restore(buildNotificationProps(id, userId, overrides))
		}

		it("saves a notification and finds it by id", async () => {
			const notification = build()

			const saved = await context.repository.save(notification)
			const found = await context.repository.findById(notification.id)

			expect(saved).toEqual({ id: notification.id })
			expect(found?.userId).toBe(userId)
			expect(found?.type).toBe("NOTICE")
			expect(found?.title).toBe("Contract notice")
			expect(found?.message).toBe("Mensagem de contrato")
			expect(found?.isRead).toBe(false)
			expect(found?.createdAt.toISOString()).toBe("2026-05-10T12:00:00.000Z")
		})

		it("returns null for an unknown id", async () => {
			expect(await context.repository.findById(context.newId())).toBeNull()
		})

		it("saving the same id again persists the read date", async () => {
			const id = context.newId()
			await context.repository.save(build({ id }))

			await context.repository.save(
				build({
					id,
					readAt: new Date("2026-05-10T13:00:00.000Z"),
					updatedAt: new Date("2026-05-10T13:00:00.000Z"),
				}),
			)

			const found = await context.repository.findById(id)
			expect(found?.isRead).toBe(true)
			expect(found?.readAt?.toISOString()).toBe("2026-05-10T13:00:00.000Z")
		})

		it("saveMany stores every notification and accepts an empty list", async () => {
			const first = build()
			const second = build()

			await context.repository.saveMany([first, second])
			await expect(context.repository.saveMany([])).resolves.toBeUndefined()

			expect((await context.repository.findById(first.id))?.id).toBe(first.id)
			expect((await context.repository.findById(second.id))?.id).toBe(second.id)
		})

		it("FR-012: findManyByUserId hides deleted notifications, filters unread and paginates by offset and limit", async () => {
			const unread = build()
			const read = build({ readAt: new Date("2026-05-10T13:00:00.000Z") })
			const deleted = build({ deletedAt: new Date("2026-05-10T14:00:00.000Z") })
			await context.repository.saveMany([unread, read, deleted])

			const all = await context.repository.findManyByUserId({ userId, page: 1 })
			const onlyUnread = await context.repository.findManyByUserId({
				userId,
				page: 1,
				onlyUnread: true,
			})
			const paged = await context.repository.findManyByUserId({
				userId,
				page: 1,
				offset: 0,
				limit: 1,
			})

			expect(all.total).toBe(2)
			expect(all.items.map((item) => item.id).sort()).toEqual(
				[unread.id, read.id].sort(),
			)
			expect(onlyUnread.items.map((item) => item.id)).toEqual([unread.id])
			expect(onlyUnread.total).toBe(1)
			expect(paged.items).toHaveLength(1)
			expect(paged.total).toBe(2)
		})

		it("countUnreadByUserId and markAllAsReadByUserId", async () => {
			const first = build()
			const second = build()
			await context.repository.saveMany([first, second])

			expect(await context.repository.countUnreadByUserId(userId)).toBe(2)
			await context.repository.markAllAsReadByUserId(userId)

			expect(await context.repository.countUnreadByUserId(userId)).toBe(0)
			expect((await context.repository.findById(first.id))?.isRead).toBe(true)
		})
	})
}
```

`apps/backend/test/repository-contract/active-recipients-provider-contract.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface RecipientSeedUser {
	id: string
	role: "MEMBER" | "ADMIN"
	status: StatusTypes
	deleted: boolean
}

export interface ActiveRecipientsProviderContractContext {
	provider: ActiveRecipientsProvider
	seed(users: RecipientSeedUser[]): Promise<void>
	newId(): string
	cleanup(): Promise<void>
}

function audience(value: "ALL" | "MEMBERS" | "ADMINS"): NoticeAudience {
	const result = NoticeAudience.create(value)
	if (result.isFailure()) throw result.value
	return result.value
}

export function describeActiveRecipientsProviderContract(
	name: string,
	factory: () => Promise<ActiveRecipientsProviderContractContext>,
): void {
	describe(`ActiveRecipientsProvider contract (${name})`, () => {
		let context: ActiveRecipientsProviderContractContext
		let activeMember: string
		let suspendedMember: string
		let activeAdmin: string
		let deletedAdmin: string
		let ours: Set<string>

		beforeEach(async () => {
			context = await factory()
			activeMember = context.newId()
			suspendedMember = context.newId()
			activeAdmin = context.newId()
			deletedAdmin = context.newId()
			ours = new Set([activeMember, suspendedMember, activeAdmin, deletedAdmin])
			await context.seed([
				{ id: activeMember, role: "MEMBER", status: "activated", deleted: false },
				{ id: suspendedMember, role: "MEMBER", status: "suspended", deleted: false },
				{ id: activeAdmin, role: "ADMIN", status: "activated", deleted: false },
				{ id: deletedAdmin, role: "ADMIN", status: "activated", deleted: true },
			])
		})

		afterEach(async () => {
			await context.cleanup()
		})

		async function idsFor(value: "ALL" | "MEMBERS" | "ADMINS"): Promise<string[]> {
			const ids = await context.provider.listActiveUserIds(audience(value))
			return ids.filter((id) => ours.has(id)).sort()
		}

		it("MEMBERS lists only active, non-deleted members", async () => {
			expect(await idsFor("MEMBERS")).toEqual([activeMember])
		})

		it("ADMINS lists only active, non-deleted admins", async () => {
			expect(await idsFor("ADMINS")).toEqual([activeAdmin])
		})

		it("ALL lists every active, non-deleted user regardless of role", async () => {
			expect(await idsFor("ALL")).toEqual([activeMember, activeAdmin].sort())
		})
	})
}
```

Invocadores in-memory (unit):

`apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.contract.test.ts`:

```ts
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeNotificationRepositoryContract } from "test/repository-contract/notification-repository-contract"
import { InMemoryNotificationRepository } from "./in-memory-notification.repository"

describeNotificationRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryNotificationRepository(),
		newId: () => recorder.newId(),
		ensureReferences: async () => {},
		cleanup: async () => {},
	}
})
```

`apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.contract.test.ts`:

```ts
import { describeActiveRecipientsProviderContract } from "test/repository-contract/active-recipients-provider-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { InMemoryActiveRecipientsProvider } from "./in-memory-active-recipients.provider"

describeActiveRecipientsProviderContract("in-memory", async () => {
	const provider = new InMemoryActiveRecipientsProvider()
	const recorder = new IdRecorder()
	return {
		provider,
		newId: () => recorder.newId(),
		seed: async (users) => {
			const eligible = users.filter(
				(user) => user.status === "activated" && !user.deleted,
			)
			provider.userIds = eligible.map((user) => user.id)
			provider.adminIds = eligible
				.filter((user) => user.role === "ADMIN")
				.map((user) => user.id)
		},
		cleanup: async () => {},
	}
})
```

Invocadores Prisma (integração):

`apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeNotificationRepositoryContract } from "test/repository-contract/notification-repository-contract"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaNotificationRepository } from "./prisma-notification.repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeNotificationRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)
	return {
		repository: new PrismaNotificationRepository(prismaClient),
		newId: () => recorder.newId(),
		ensureReferences: ({ userIds }) => seeder.ensureUsers(userIds),
		cleanup: () => seeder.cleanup(),
	}
})
```

`apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { describeActiveRecipientsProviderContract } from "test/repository-contract/active-recipients-provider-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaActiveRecipientsProvider } from "./prisma-active-recipients.provider"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeActiveRecipientsProviderContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		provider: new PrismaActiveRecipientsProvider(prismaClient),
		newId: () => recorder.newId(),
		seed: async (users) => {
			await prismaClient.user.createMany({
				data: users.map((user) => ({
					id: user.id,
					name: "Recipient",
					email: `${user.id}@recipient.test`,
					role: user.role,
					status: user.status,
					deleted_at: user.deleted ? new Date("2026-04-01T00:00:00.000Z") : null,
				})),
			})
		},
		cleanup: async () => {
			await prismaClient.user.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
```

Mongo, repositório — `apps/backend/src/notification/infra/repository/mongo/mongo-notification.repository.integration-test.ts`:

```ts
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import {
	buildNotificationProps,
	describeNotificationRepositoryContract,
	type NotificationProps,
} from "test/repository-contract/notification-repository-contract"
import { Notification } from "@/notification/domain/notification.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { MongoNotificationRepository } from "./mongo-notification.repository"

const CLEANUP_TARGETS = [
	{ collection: COLLECTIONS.NOTIFICATIONS, fields: ["_id", "user_id"] },
	{ collection: COLLECTIONS.USER_NOTIFICATIONS, fields: ["notification_id", "user_id"] },
]

describe("MongoNotificationRepository", () => {
	let connection: MongoConnection
	let repository: MongoNotificationRepository
	const recorder = new IdRecorder()

	function build(userId: string, overrides: Partial<NotificationProps> = {}): Notification {
		const id = overrides.id ?? recorder.newId()
		return Notification.restore(buildNotificationProps(id, userId, overrides))
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoNotificationRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeNotificationRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoNotificationRepository(connection),
			newId: () => contractRecorder.newId(),
			ensureReferences: async () => {},
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, CLEANUP_TARGETS),
		}
	})

	describe("mongo specifics", () => {
		afterEach(() =>
			deleteDocumentsReferencing(connection, recorder.ids, CLEANUP_TARGETS),
		)

		it("FR-009: save writes the notification and its user notification", async () => {
			const userId = recorder.newId()
			const notification = build(userId)

			await repository.save(notification)

			const notifications = connection.collection<Document>(COLLECTIONS.NOTIFICATIONS)
			const userNotifications = connection.collection<Document>(
				COLLECTIONS.USER_NOTIFICATIONS,
			)
			expect(await notifications.findOne({ _id: notification.id })).toMatchObject({
				user_id: userId,
				type: "NOTICE",
				title: "Contract notice",
				gym_name: null,
				reason: null,
			})
			expect(
				await userNotifications.countDocuments({ notification_id: notification.id }),
			).toBe(1)
		})

		it("FR-009: saving the same notification again updates its user notification instead of creating another", async () => {
			const userId = recorder.newId()
			const id = recorder.newId()
			await repository.save(build(userId, { id }))

			await repository.save(
				build(userId, { id, readAt: new Date("2026-05-10T13:00:00.000Z") }),
			)

			const userNotifications = connection.collection<Document>(
				COLLECTIONS.USER_NOTIFICATIONS,
			)
			expect(await userNotifications.countDocuments({ notification_id: id })).toBe(1)
			expect(
				(await userNotifications.findOne({ notification_id: id }))?.read_at,
			).toEqual(new Date("2026-05-10T13:00:00.000Z"))
		})

		it("FR-009: saveMany writes notifications and user notifications in one transaction, so nothing stays when it fails", async () => {
			const userId = recorder.newId()
			const duplicated = build(userId)

			await expect(repository.saveMany([duplicated, duplicated])).rejects.toThrow()

			expect(await repository.findById(duplicated.id)).toBeNull()
			expect(
				await connection
					.collection<Document>(COLLECTIONS.USER_NOTIFICATIONS)
					.countDocuments({ notification_id: duplicated.id }),
			).toBe(0)
		})

		it("markAllAsReadByUserId leaves deleted user notifications untouched", async () => {
			const userId = recorder.newId()
			const deleted = build(userId, {
				deletedAt: new Date("2026-05-10T14:00:00.000Z"),
			})
			await repository.save(deleted)

			await repository.markAllAsReadByUserId(userId)

			const document = await connection
				.collection<Document>(COLLECTIONS.USER_NOTIFICATIONS)
				.findOne({ notification_id: deleted.id })
			expect(document?.read_at).toBeNull()
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("withTransaction joins the unit of work and rolls back when it fails", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const notification = build(recorder.newId())

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository.withTransaction(tx).save(notification)
					throw new Error("rollback")
				}),
			).rejects.toThrow("rollback")

			expect(await repository.findById(notification.id)).toBeNull()
		})
	})
})
```

Mongo, provider — `apps/backend/src/notification/infra/provider/mongo/mongo-active-recipients.provider.integration-test.ts`:

```ts
import type { Document } from "mongodb"
import { afterAll, beforeAll, describe } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { describeActiveRecipientsProviderContract } from "test/repository-contract/active-recipients-provider-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoActiveRecipientsProvider } from "./mongo-active-recipients.provider"

describe("MongoActiveRecipientsProvider", () => {
	let connection: MongoConnection

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeActiveRecipientsProviderContract("mongo", async () => {
		const recorder = new IdRecorder()
		return {
			provider: new MongoActiveRecipientsProvider(connection),
			newId: () => recorder.newId(),
			seed: async (users) => {
				await connection.collection<Document>(COLLECTIONS.USERS).insertMany(
					users.map((user) => ({
						_id: user.id,
						name: "Recipient",
						email: `${user.id}@recipient.test`,
						password_hash: null,
						google_id: null,
						created_at: new Date("2026-03-01T10:00:00.000Z"),
						role: user.role,
						updated_at: new Date("2026-03-01T10:00:00.000Z"),
						status: user.status,
						billing_customer_id: null,
						is_super_admin: false,
						deleted_at: user.deleted ? new Date("2026-04-01T00:00:00.000Z") : null,
					})),
				)
			},
			cleanup: () =>
				deleteDocumentsReferencing(connection, recorder.ids, [
					{ collection: COLLECTIONS.USERS, fields: ["_id"] },
				]),
		}
	})
})
```

- **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/infra/repository/in-memory/in-memory-notification.repository.contract.test.ts`
Expected: PASS (6 testes) se o in-memory já cumpre o contrato; falhas são divergências do in-memory e se corrigem lá, nunca relaxando o contrato.

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.contract.test.ts`
Expected: PASS (3 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/repository/prisma/prisma-notification.repository.contract.integration-test.ts`
Expected: PASS (6 testes) se o contrato descreve o comportamento atual do Prisma

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/provider/prisma/prisma-active-recipients.provider.contract.integration-test.ts`
Expected: PASS (3 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/repository/mongo/mongo-notification.repository.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-notification.repository""

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/provider/mongo/mongo-active-recipients.provider.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-active-recipients.provider""

- **Step 3: Write minimal implementation**

`apps/backend/src/notification/infra/repository/mongo/mongo-notification.repository.ts`:

```ts
import { randomUUID } from "node:crypto"
import { inject, injectable } from "inversify"
import type { ClientSession, Collection, Filter } from "mongodb"
import type {
	FindManyNotificationsInput,
	FindManyNotificationsOutput,
	NotificationRepository,
	SaveNotificationResponse,
} from "@/notification/application/repository/notification.repository.js"
import {
	Notification,
	type NotificationType,
} from "@/notification/domain/notification.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	runInTransaction,
	sessionOptions,
} from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { env } from "@/shared/infra/env/index.js"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

export type NotificationDocument = {
	_id: string
	user_id: string
	type: NotificationType
	title: string
	message: string
	gym_name: string | null
	reason: string | null
	created_at: Date
	updated_at: Date
}

export type UserNotificationDocument = {
	_id: string
	notification_id: string
	user_id: string
	read_at: Date | null
	deleted_at: Date | null
	created_at: Date
	updated_at: Date
}

type UserNotificationWithNotification = UserNotificationDocument & {
	notification: NotificationDocument
}

@injectable()
export class MongoNotificationRepository implements NotificationRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): NotificationRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoNotificationRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(
		notification: Notification,
	): Promise<SaveNotificationResponse> {
		await runInTransaction(this.connection, this.session, async (session) => {
			await this.notifications().updateOne(
				{ _id: notification.id },
				{
					$set: { updated_at: notification.updatedAt },
					$setOnInsert: {
						user_id: notification.userId,
						type: notification.type,
						title: notification.title,
						message: notification.message,
						gym_name: notification.gymName ?? null,
						reason: notification.reason ?? null,
						created_at: notification.createdAt,
					},
				},
				{ upsert: true, session },
			)
			await this.userNotifications().updateOne(
				{ notification_id: notification.id, user_id: notification.userId },
				{
					$set: {
						read_at: notification.readAt ?? null,
						deleted_at: notification.deletedAt ?? null,
						updated_at: notification.updatedAt,
					},
					$setOnInsert: {
						_id: randomUUID(),
						created_at: notification.createdAt,
					},
				},
				{ upsert: true, session },
			)
		})
		return { id: notification.id }
	}

	public async saveMany(notifications: Notification[]): Promise<void> {
		if (notifications.length === 0) return
		await runInTransaction(this.connection, this.session, async (session) => {
			await this.notifications().insertMany(
				notifications.map((notification) => ({
					_id: notification.id,
					user_id: notification.userId,
					type: notification.type,
					title: notification.title,
					message: notification.message,
					gym_name: notification.gymName ?? null,
					reason: notification.reason ?? null,
					created_at: notification.createdAt,
					updated_at: notification.updatedAt,
				})),
				{ session },
			)
			await this.userNotifications().insertMany(
				notifications.map((notification) => ({
					_id: randomUUID(),
					notification_id: notification.id,
					user_id: notification.userId,
					read_at: notification.readAt ?? null,
					deleted_at: notification.deletedAt ?? null,
					created_at: notification.createdAt,
					updated_at: notification.updatedAt,
				})),
				{ session },
			)
		})
	}

	public async findById(id: string): Promise<Notification | null> {
		const notification = await this.notifications().findOne(
			{ _id: id },
			sessionOptions(this.session),
		)
		if (!notification) return null
		const userNotification = await this.userNotifications().findOne(
			{ notification_id: id },
			sessionOptions(this.session),
		)
		return this.toDomain(notification, userNotification)
	}

	public async findManyByUserId(
		input: FindManyNotificationsInput,
	): Promise<FindManyNotificationsOutput> {
		const match = this.buildMatch(input)
		const { skip, take } = this.resolvePagination(input)
		const [rows, total] = await Promise.all([
			this.userNotifications()
				.aggregate<UserNotificationWithNotification>(
					[
						{ $match: match },
						{
							$lookup: {
								from: COLLECTIONS.NOTIFICATIONS,
								localField: "notification_id",
								foreignField: "_id",
								as: "notification",
							},
						},
						{ $unwind: "$notification" },
						{ $sort: { "notification.created_at": -1, "notification._id": -1 } },
						{ $skip: skip },
						{ $limit: take },
					],
					sessionOptions(this.session),
				)
				.toArray(),
			this.userNotifications().countDocuments(match, sessionOptions(this.session)),
		])
		return {
			items: rows.map(({ notification, ...userNotification }) =>
				this.toDomain(notification, userNotification),
			),
			total,
		}
	}

	public async countUnreadByUserId(userId: string): Promise<number> {
		return this.userNotifications().countDocuments(
			{ user_id: userId, read_at: null, deleted_at: null },
			sessionOptions(this.session),
		)
	}

	public async markAllAsReadByUserId(userId: string): Promise<void> {
		const now = new Date()
		await this.userNotifications().updateMany(
			{ user_id: userId, read_at: null, deleted_at: null },
			{ $set: { read_at: now, updated_at: now } },
			sessionOptions(this.session),
		)
	}

	private notifications(): Collection<NotificationDocument> {
		return this.connection.collection<NotificationDocument>(
			COLLECTIONS.NOTIFICATIONS,
		)
	}

	private userNotifications(): Collection<UserNotificationDocument> {
		return this.connection.collection<UserNotificationDocument>(
			COLLECTIONS.USER_NOTIFICATIONS,
		)
	}

	private buildMatch(
		input: FindManyNotificationsInput,
	): Filter<UserNotificationDocument> {
		const match: Filter<UserNotificationDocument> = {
			user_id: input.userId,
			deleted_at: null,
		}
		if (input.onlyUnread) match.read_at = null
		return match
	}

	private resolvePagination(input: FindManyNotificationsInput): {
		skip: number
		take: number
	} {
		if (input.offset !== undefined && input.limit !== undefined) {
			return { skip: input.offset, take: input.limit }
		}
		return {
			skip: (input.page - 1) * env.ITEMS_PER_PAGE,
			take: env.ITEMS_PER_PAGE,
		}
	}

	private toDomain(
		notification: NotificationDocument,
		userNotification: UserNotificationDocument | null,
	): Notification {
		return Notification.restore({
			id: notification._id,
			userId: notification.user_id,
			type: notification.type,
			title: notification.title,
			message: notification.message,
			gymName: notification.gym_name ?? undefined,
			reason: notification.reason ?? undefined,
			readAt: userNotification?.read_at ?? undefined,
			deletedAt: userNotification?.deleted_at ?? undefined,
			createdAt: notification.created_at,
			updatedAt: notification.updated_at,
		})
	}
}
```

`apps/backend/src/notification/infra/provider/mongo/mongo-active-recipients.provider.ts`:

```ts
import { inject, injectable } from "inversify"
import type { Filter } from "mongodb"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import type { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

@injectable()
export class MongoActiveRecipientsProvider implements ActiveRecipientsProvider {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async listActiveUserIds(audience: NoticeAudience): Promise<string[]> {
		const filter: Filter<UserDocument> = {
			status: "activated",
			deleted_at: null,
			...this.roleFilter(audience),
		}
		const users = await this.connection
			.collection<UserDocument>(COLLECTIONS.USERS)
			.find(filter, { projection: { _id: 1 } })
			.toArray()
		return users.map((user) => user._id)
	}

	private roleFilter(
		audience: NoticeAudience,
	): { role: "MEMBER" | "ADMIN" } | undefined {
		switch (audience.value) {
			case "MEMBERS":
				return { role: "MEMBER" }
			case "ADMINS":
				return { role: "ADMIN" }
			case "ALL":
				return undefined
		}
	}
}
```

- **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/repository/mongo/mongo-notification.repository.integration-test.ts`
Expected: PASS (12 testes: 6 do contrato e 6 específicos)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/provider/mongo/mongo-active-recipients.provider.integration-test.ts`
Expected: PASS (3 testes)

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/notification apps/backend/test/repository-contract
git commit -m "feat(backend): repositório de notificação e provider de destinatários no Mongo"
```

## Critérios de Sucesso

- FR-004: `MongoNotificationRepository` cumpre a porta `NotificationRepository` (save, saveMany, findById, findManyByUserId, countUnreadByUserId, markAllAsReadByUserId) e `MongoActiveRecipientsProvider` cumpre `ActiveRecipientsProvider`.
- FR-009: ao salvar uma `Notification`, a `UserNotification` associada é criada ou atualizada na mesma transação, e `saveMany` falho não deixa nada gravado (testes `FR-009`); a exclusão em cascata não tem caminho de código nas portas e é tratada como `[unverified]` na task do ETL.
- A listagem filtra `deleted_at`, `onlyUnread` e pagina por `offset`/`limit` ou página, como o Prisma.
- `describeNotificationRepositoryContract` e `describeActiveRecipientsProviderContract` passam em in-memory, Prisma e Mongo.
