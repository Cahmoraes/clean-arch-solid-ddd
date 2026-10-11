# Task 9: Repositório e DAO de atividade de usuário no Mongo [FR-004, FR-012]

**Status:** DONE

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task entrega `MongoUserActivityRepository` (grava um evento de atividade) e `MongoUserActivityDao`, que monta a página de atividade de um usuário mesclando duas fontes, os eventos de atividade e os check-ins (com o título da academia), com a mesma regra de contagem, ordenação e paginação do `PrismaUserActivityDao`. A task também cria a suíte de contrato do DAO de atividade e a invoca nos três lados.

## Arquivos

- Create: `apps/backend/src/shared/infra/database/repository/mongo/mongo-user-activity-repository.ts`
- Create: `apps/backend/src/shared/infra/database/dao/mongo/mongo-user-activity-dao.ts`
- Create: `apps/backend/test/repository-contract/user-activity-dao-contract.ts`
- Test: `apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.contract.test.ts`
- Test: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.contract.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/dao/mongo/mongo-user-activity-dao.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/mongo-user-activity-repository.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { collection<T extends Document>(name: string): Collection<T> }`, `COLLECTIONS.USER_ACTIVITY_EVENTS`, `COLLECTIONS.CHECK_INS`, `COLLECTIONS.GYMS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
  - `SHARED_TYPES.Mongo.Connection` de `@/shared/infra/ioc/types` (task-02)
  - `type CheckInDocument` (campos `_id`, `created_at`, `validated_at`, `rejected_at`, `latitude`, `longitude`, `user_id`, `gym_id`, `updated_at`, `dayKey`) de `@/shared/infra/database/repository/mongo/mongo-check-in-repository` (task-06)
  - `class PrismaReferenceSeeder { ensureUsers(ids: readonly string[]): Promise<void>; ensureGyms(ids: readonly string[]): Promise<void>; cleanup(): Promise<void> }` de `test/repository-contract/prisma-reference-seeder` (task-06)
  - `class IdRecorder { newId(): string; get ids(): readonly string[] }` de `test/repository-contract/id-recorder` e `deleteDocumentsReferencing(connection, ids, targets)` de `test/mongo/delete-documents-referencing` (task-04)
- **Produz:**
  - `class MongoUserActivityRepository implements UserActivityRepository` (`@injectable()`, construtor `(connection: MongoConnection)`, `record(input: RecordUserActivityInput): Promise<void>`) e `type UserActivityEventDocument` em `@/shared/infra/database/repository/mongo/mongo-user-activity-repository`
  - `class MongoUserActivityDao implements UserActivityDao` (`@injectable()`, construtor `(connection: MongoConnection)`, `findActivityPage(userId: string, page: number, pageSize: number): Promise<UserActivityPage>`) em `@/shared/infra/database/dao/mongo/mongo-user-activity-dao`
  - `describeUserActivityDaoContract(name: string, factory: () => Promise<UserActivityDaoContractContext>): void` com `interface UserActivityDaoContractContext { seed(data: ActivitySeed): Promise<UserActivityDao>; newId(): string; cleanup(): Promise<void> }` e `interface ActivitySeed { userId: string; gymId: string; gymTitle: string; events: { id: string; type: UserActivityItemType; description: string; occurredAt: Date }[]; checkIns: { id: string; occurredAt: Date }[] }` em `test/repository-contract/user-activity-dao-contract`
  - Convenção do documento `user_activity_events`: `_id` (UUID), `user_id`, `type`, `description`, `metadata` (objeto ou `null`), `occurred_at`, `created_at`

### Skills a invocar

- `typescript-advanced`: `UserActivityEventDocument` como `type` alias com `metadata: Record<string, unknown> | null`; o item de atividade usa `UserActivityItemType` sem cast além do que o Prisma já faz na fronteira.
- `no-workarounds`: a mescla das duas fontes repete a regra do Prisma (contar antes, pegar `skip + pageSize` de cada fonte, ordenar por `occurredAt` e `id` decrescentes, fatiar); um check-in cuja academia não existe é erro explícito, não uma descrição inventada.
- `test-antipatterns`: o DAO é provado com dados semeados em cada banco real e no in-memory, comparando a página inteira; o erro de academia ausente é exercitado com um documento real órfão.

## Passos

- **Step 1: Write the failing tests (contract, repository and DAO)**

`apps/backend/test/repository-contract/user-activity-dao-contract.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type {
	UserActivityDao,
	UserActivityItemType,
} from "@/user/application/persistence/dao/user-activity-dao"

export interface ActivitySeed {
	userId: string
	gymId: string
	gymTitle: string
	events: {
		id: string
		type: UserActivityItemType
		description: string
		occurredAt: Date
	}[]
	checkIns: { id: string; occurredAt: Date }[]
}

export interface UserActivityDaoContractContext {
	seed(data: ActivitySeed): Promise<UserActivityDao>
	newId(): string
	cleanup(): Promise<void>
}

export function describeUserActivityDaoContract(
	name: string,
	factory: () => Promise<UserActivityDaoContractContext>,
): void {
	describe(`UserActivityDao contract (${name})`, () => {
		let context: UserActivityDaoContractContext
		let userId: string
		let gymId: string

		beforeEach(async () => {
			context = await factory()
			userId = context.newId()
			gymId = context.newId()
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function seedData(overrides: Partial<ActivitySeed> = {}): ActivitySeed {
			return {
				userId,
				gymId,
				gymTitle: "Academia Atividade",
				events: [
					{
						id: context.newId(),
						type: "LOGIN",
						description: "Login realizado",
						occurredAt: new Date("2026-05-10T10:00:00.000Z"),
					},
					{
						id: context.newId(),
						type: "PROFILE_UPDATED",
						description: "Perfil atualizado",
						occurredAt: new Date("2026-05-12T12:00:00.000Z"),
					},
				],
				checkIns: [
					{ id: context.newId(), occurredAt: new Date("2026-05-11T11:00:00.000Z") },
					{ id: context.newId(), occurredAt: new Date("2026-05-13T13:00:00.000Z") },
				],
				...overrides,
			}
		}

		it("FR-012: merges events and check-ins, newest first", async () => {
			const data = seedData()
			const dao = await context.seed(data)

			const page = await dao.findActivityPage(userId, 1, 10)

			expect(page.items.map((item) => item.id)).toEqual([
				data.checkIns[1].id,
				data.events[1].id,
				data.checkIns[0].id,
				data.events[0].id,
			])
			expect(page.pagination).toEqual({ page: 1, pageSize: 10, total: 4, totalPages: 1 })
		})

		it("describes a check-in with the gym title and the CHECK_IN type", async () => {
			const data = seedData({ events: [], checkIns: [{ id: context.newId(), occurredAt: new Date("2026-05-11T11:00:00.000Z") }] })
			const dao = await context.seed(data)

			const page = await dao.findActivityPage(userId, 1, 10)

			expect(page.items).toEqual([
				{
					id: data.checkIns[0].id,
					type: "CHECK_IN",
					description: "Check-in — Academia Atividade",
					occurredAt: new Date("2026-05-11T11:00:00.000Z"),
				},
			])
		})

		it("maps the stored event fields", async () => {
			const data = seedData({ checkIns: [] })
			const dao = await context.seed(data)

			const page = await dao.findActivityPage(userId, 1, 10)

			expect(page.items).toContainEqual({
				id: data.events[1].id,
				type: "PROFILE_UPDATED",
				description: "Perfil atualizado",
				occurredAt: new Date("2026-05-12T12:00:00.000Z"),
			})
		})

		it("paginates the merged list and reports the page metadata", async () => {
			const data = seedData()
			const dao = await context.seed(data)

			const first = await dao.findActivityPage(userId, 1, 2)
			const second = await dao.findActivityPage(userId, 2, 2)

			expect(first.items.map((item) => item.id)).toEqual([
				data.checkIns[1].id,
				data.events[1].id,
			])
			expect(second.items.map((item) => item.id)).toEqual([
				data.checkIns[0].id,
				data.events[0].id,
			])
			expect(second.pagination).toEqual({ page: 2, pageSize: 2, total: 4, totalPages: 2 })
		})

		it("a page past the last one returns no items but keeps the pagination", async () => {
			const dao = await context.seed(seedData())

			const page = await dao.findActivityPage(userId, 5, 2)

			expect(page.items).toEqual([])
			expect(page.pagination).toEqual({ page: 5, pageSize: 2, total: 4, totalPages: 2 })
		})

		it("events with the same instant are ordered by id descending", async () => {
			const sameInstant = new Date("2026-05-10T10:00:00.000Z")
			const firstId = context.newId()
			const secondId = context.newId()
			const data = seedData({
				checkIns: [],
				events: [
					{ id: firstId, type: "LOGIN", description: "a", occurredAt: sameInstant },
					{ id: secondId, type: "LOGIN", description: "b", occurredAt: sameInstant },
				],
			})
			const dao = await context.seed(data)

			const page = await dao.findActivityPage(userId, 1, 10)

			expect(page.items.map((item) => item.id)).toEqual(
				[firstId, secondId].sort().reverse(),
			)
		})
	})
}
```

`apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.contract.test.ts`:

```ts
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserActivityDaoContract } from "test/repository-contract/user-activity-dao-contract"
import { InMemoryUserActivityDao } from "./user-activity-dao-memory"

describeUserActivityDaoContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		newId: () => recorder.newId(),
		seed: async (data) =>
			new InMemoryUserActivityDao([
				...data.events.map((event) => ({
					id: event.id,
					type: event.type,
					description: event.description,
					occurredAt: event.occurredAt,
				})),
				...data.checkIns.map((checkIn) => ({
					id: checkIn.id,
					type: "CHECK_IN" as const,
					description: `Check-in — ${data.gymTitle}`,
					occurredAt: checkIn.occurredAt,
				})),
			]),
		cleanup: async () => {},
	}
})
```

`apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { describeUserActivityDaoContract } from "test/repository-contract/user-activity-dao-contract"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaUserActivityDao } from "./prisma-user-activity-dao"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeUserActivityDaoContract("prisma", async () => {
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)
	return {
		newId: () => recorder.newId(),
		seed: async (data) => {
			await seeder.ensureUsers([data.userId])
			await seeder.ensureGyms([data.gymId])
			await prismaClient.gym.update({
				where: { id: data.gymId },
				data: { title: data.gymTitle },
			})
			await prismaClient.userActivityEvent.createMany({
				data: data.events.map((event) => ({
					id: event.id,
					userId: data.userId,
					type: event.type,
					description: event.description,
					occurredAt: event.occurredAt,
				})),
			})
			await prismaClient.checkIn.createMany({
				data: data.checkIns.map((checkIn) => ({
					id: checkIn.id,
					user_id: data.userId,
					gym_id: data.gymId,
					created_at: checkIn.occurredAt,
					latitude: -23.5505,
					longitude: -46.6333,
				})),
			})
			return new PrismaUserActivityDao(prismaClient)
		},
		cleanup: () => seeder.cleanup(),
	}
})
```

`apps/backend/src/shared/infra/database/dao/mongo/mongo-user-activity-dao.integration-test.ts`:

```ts
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserActivityDaoContract } from "test/repository-contract/user-activity-dao-contract"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import type { UserActivityEventDocument } from "@/shared/infra/database/repository/mongo/mongo-user-activity-repository"
import { MongoUserActivityDao } from "./mongo-user-activity-dao"

const CLEANUP_TARGETS = [
	{ collection: COLLECTIONS.USER_ACTIVITY_EVENTS, fields: ["_id", "user_id"] },
	{ collection: COLLECTIONS.CHECK_INS, fields: ["_id", "user_id", "gym_id"] },
	{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
]

describe("MongoUserActivityDao", () => {
	let connection: MongoConnection

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeUserActivityDaoContract("mongo", async () => {
		const recorder = new IdRecorder()
		return {
			newId: () => recorder.newId(),
			seed: async (data) => {
				await connection
					.collection<Document>(COLLECTIONS.GYMS)
					.insertOne({ _id: data.gymId, title: data.gymTitle })
				if (data.events.length > 0) {
					await connection
						.collection<UserActivityEventDocument>(COLLECTIONS.USER_ACTIVITY_EVENTS)
						.insertMany(
							data.events.map((event) => ({
								_id: event.id,
								user_id: data.userId,
								type: event.type,
								description: event.description,
								metadata: null,
								occurred_at: event.occurredAt,
								created_at: event.occurredAt,
							})),
						)
				}
				if (data.checkIns.length > 0) {
					await connection
						.collection<CheckInDocument>(COLLECTIONS.CHECK_INS)
						.insertMany(
							data.checkIns.map((checkIn) => ({
								_id: checkIn.id,
								created_at: checkIn.occurredAt,
								validated_at: null,
								rejected_at: null,
								latitude: -23.5505,
								longitude: -46.6333,
								user_id: data.userId,
								gym_id: data.gymId,
								updated_at: checkIn.occurredAt,
								dayKey: checkIn.occurredAt.toISOString().slice(0, 10),
							})),
						)
				}
				return new MongoUserActivityDao(connection)
			},
			cleanup: () => deleteDocumentsReferencing(connection, recorder.ids, CLEANUP_TARGETS),
		}
	})

	describe("mongo specifics", () => {
		const recorder = new IdRecorder()

		afterEach(() => deleteDocumentsReferencing(connection, recorder.ids, CLEANUP_TARGETS))

		it("fails explicitly when a check-in references a gym that does not exist", async () => {
			const userId = recorder.newId()
			const checkInId = recorder.newId()
			const missingGymId = recorder.newId()
			await connection.collection<CheckInDocument>(COLLECTIONS.CHECK_INS).insertOne({
				_id: checkInId,
				created_at: new Date("2026-05-11T11:00:00.000Z"),
				validated_at: null,
				rejected_at: null,
				latitude: -23.5505,
				longitude: -46.6333,
				user_id: userId,
				gym_id: missingGymId,
				updated_at: new Date("2026-05-11T11:00:00.000Z"),
				dayKey: "2026-05-11",
			})

			await expect(
				new MongoUserActivityDao(connection).findActivityPage(userId, 1, 10),
			).rejects.toThrow(missingGymId)
		})
	})
})
```

`apps/backend/src/shared/infra/database/repository/mongo/mongo-user-activity-repository.integration-test.ts`:

```ts
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { MongoUserActivityDao } from "@/shared/infra/database/dao/mongo/mongo-user-activity-dao"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoUserActivityRepository } from "./mongo-user-activity-repository"

describe("MongoUserActivityRepository", () => {
	let connection: MongoConnection
	let repository: MongoUserActivityRepository
	const recorder = new IdRecorder()

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoUserActivityRepository(connection)
	})

	afterEach(async () => {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.USER_ACTIVITY_EVENTS, fields: ["user_id"] },
		])
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("FR-004: record stores the event with the Prisma column names", async () => {
		const userId = recorder.newId()
		const occurredAt = new Date("2026-05-10T10:00:00.000Z")

		await repository.record({
			userId,
			type: "LOGIN",
			description: "Login realizado",
			metadata: { ip: "127.0.0.1" },
			occurredAt,
		})
		await repository.record({
			userId,
			type: "PASSWORD_CHANGED",
			description: "Senha alterada",
			occurredAt: new Date("2026-05-11T10:00:00.000Z"),
		})

		const documents = await connection
			.collection<Document>(COLLECTIONS.USER_ACTIVITY_EVENTS)
			.find({ user_id: userId })
			.sort({ occurred_at: 1 })
			.toArray()
		expect(documents).toHaveLength(2)
		expect(documents[0]).toMatchObject({
			user_id: userId,
			type: "LOGIN",
			description: "Login realizado",
			metadata: { ip: "127.0.0.1" },
			occurred_at: occurredAt,
		})
		expect(documents[1].metadata).toBeNull()
	})

	it("FR-004: a recorded event shows up in the activity page of the user", async () => {
		const userId = recorder.newId()
		await repository.record({
			userId,
			type: "LOGIN",
			description: "Login realizado",
			occurredAt: new Date("2026-05-10T10:00:00.000Z"),
		})

		const page = await new MongoUserActivityDao(connection).findActivityPage(userId, 1, 10)

		expect(page.items.map((item) => item.description)).toEqual(["Login realizado"])
		expect(page.pagination.total).toBe(1)
	})
})
```

- **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/dao/in-memory/user-activity-dao-memory.contract.test.ts`
Expected: PASS (6 testes) se o in-memory já cumpre o contrato; falhas são divergências do in-memory e se corrigem lá.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/dao/prisma/prisma-user-activity-dao.contract.integration-test.ts`
Expected: PASS (6 testes) se o contrato descreve o comportamento atual do Prisma

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/dao/mongo/mongo-user-activity-dao.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-user-activity-dao""

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-user-activity-repository.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-user-activity-repository""

- **Step 3: Write minimal implementation**

`apps/backend/src/shared/infra/database/repository/mongo/mongo-user-activity-repository.ts`:

```ts
import { randomUUID } from "node:crypto"
import { inject, injectable } from "inversify"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	RecordUserActivityInput,
	UserActivityRepository,
} from "@/user/application/persistence/repository/user-activity-repository"

export type UserActivityEventDocument = {
	_id: string
	user_id: string
	type: string
	description: string
	metadata: Record<string, unknown> | null
	occurred_at: Date
	created_at: Date
}

@injectable()
export class MongoUserActivityRepository implements UserActivityRepository {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async record(input: RecordUserActivityInput): Promise<void> {
		await this.connection
			.collection<UserActivityEventDocument>(COLLECTIONS.USER_ACTIVITY_EVENTS)
			.insertOne({
				_id: randomUUID(),
				user_id: input.userId,
				type: input.type,
				description: input.description,
				metadata: input.metadata ?? null,
				occurred_at: input.occurredAt,
				created_at: new Date(),
			})
	}
}
```

`apps/backend/src/shared/infra/database/dao/mongo/mongo-user-activity-dao.ts`:

```ts
import { inject, injectable } from "inversify"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import type { UserActivityEventDocument } from "@/shared/infra/database/repository/mongo/mongo-user-activity-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	UserActivityDao,
	UserActivityItem,
	UserActivityItemType,
	UserActivityPage,
} from "@/user/application/persistence/dao/user-activity-dao"

type GymTitleDocument = { _id: string; title: string }

@injectable()
export class MongoUserActivityDao implements UserActivityDao {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async findActivityPage(
		userId: string,
		page: number,
		pageSize: number,
	): Promise<UserActivityPage> {
		const events = this.connection.collection<UserActivityEventDocument>(
			COLLECTIONS.USER_ACTIVITY_EVENTS,
		)
		const checkIns = this.connection.collection<CheckInDocument>(
			COLLECTIONS.CHECK_INS,
		)
		const [activityEventsTotal, checkInsTotal] = await Promise.all([
			events.countDocuments({ user_id: userId }),
			checkIns.countDocuments({ user_id: userId }),
		])
		const total = activityEventsTotal + checkInsTotal
		const totalPages = Math.ceil(total / pageSize)
		const pagination = { page, pageSize, total, totalPages }

		// Count first: out-of-range pages keep 200 + metadata without oversized queries.
		if (page > totalPages) return { items: [], pagination }

		const skip = (page - 1) * pageSize
		if (!Number.isSafeInteger(skip)) return { items: [], pagination }
		const sourceTake = skip + pageSize
		const [eventDocuments, checkInDocuments] = await Promise.all([
			events
				.find({ user_id: userId })
				.sort({ occurred_at: -1, _id: -1 })
				.limit(Math.min(sourceTake, activityEventsTotal))
				.toArray(),
			checkIns
				.find({ user_id: userId })
				.sort({ created_at: -1, _id: -1 })
				.limit(Math.min(sourceTake, checkInsTotal))
				.toArray(),
		])
		const gymTitles = await this.loadGymTitles(
			checkInDocuments.map((checkIn) => checkIn.gym_id),
		)

		const mappedEvents: UserActivityItem[] = eventDocuments.map((event) => ({
			id: event._id,
			type: event.type as UserActivityItemType,
			description: event.description,
			occurredAt: event.occurred_at,
		}))
		const mappedCheckIns: UserActivityItem[] = checkInDocuments.map(
			(checkIn) => {
				const title = gymTitles.get(checkIn.gym_id)
				if (title === undefined) {
					throw new Error(
						`Gym ${checkIn.gym_id} of check-in ${checkIn._id} was not found`,
					)
				}
				return {
					id: checkIn._id,
					type: "CHECK_IN",
					description: `Check-in — ${title}`,
					occurredAt: checkIn.created_at,
				}
			},
		)

		const items = [...mappedEvents, ...mappedCheckIns]
			.sort((a, b) => {
				const occurredAtDifference =
					b.occurredAt.getTime() - a.occurredAt.getTime()
				if (occurredAtDifference !== 0) return occurredAtDifference
				return Number(b.id > a.id) - Number(b.id < a.id)
			})
			.slice(skip, skip + pageSize)

		return { items, pagination }
	}

	private async loadGymTitles(gymIds: string[]): Promise<Map<string, string>> {
		if (gymIds.length === 0) return new Map()
		const gyms = await this.connection
			.collection<GymTitleDocument>(COLLECTIONS.GYMS)
			.find({ _id: { $in: [...new Set(gymIds)] } }, { projection: { title: 1 } })
			.toArray()
		return new Map(gyms.map((gym) => [gym._id, gym.title]))
	}
}
```

(`event.type as UserActivityItemType` repete o cast que o `PrismaUserActivityDao` já faz na fronteira de persistência; é o único cast desta task.)

- **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/dao/mongo/mongo-user-activity-dao.integration-test.ts`
Expected: PASS (7 testes: 6 do contrato e 1 específico)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-user-activity-repository.integration-test.ts`
Expected: PASS (2 testes)

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/shared/infra/database apps/backend/test/repository-contract
git commit -m "feat(backend): repositório e DAO de atividade de usuário no Mongo"
```

## Critérios de Sucesso

- FR-004: `MongoUserActivityRepository.record` grava o evento com os nomes de coluna do Prisma e o evento aparece na página de atividade do usuário.
- FR-012: `MongoUserActivityDao.findActivityPage` mescla eventos e check-ins, conta antes (página fora do intervalo devolve itens vazios com a paginação), ordena por instante e id decrescentes e pagina como o Prisma.
- Um check-in cuja academia não existe falha com erro explícito que cita o id da academia.
- `describeUserActivityDaoContract` passa em in-memory, Prisma e Mongo.
