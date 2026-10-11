# Task 6: Repositório de check-in no Mongo com unicidade por usuário e dia [FR-004, FR-007, FR-012]

**Status:** DONE

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task entrega `MongoCheckInRepository`. O documento de check-in guarda `dayKey` (a data UTC derivada de `created_at`) e um índice único `(user_id, dayKey)` impede o segundo check-in do mesmo usuário no mesmo dia, traduzindo o código 11000 para o `DuplicateCheckInError` que o Prisma já devolve. `onSameDateOfUserId` usa o mesmo intervalo do dia local que o adaptador Prisma, e `save` é um upsert que só atualiza `validated_at` e `rejected_at`. A task também cria a suíte de contrato de check-in e o utilitário de referências (FK) para o lado Prisma, que as próximas tasks reutilizam.

## Arquivos

- Create: `apps/backend/src/shared/infra/database/repository/mongo/mongo-check-in-repository.ts`
- Create: `apps/backend/test/repository-contract/check-in-repository-contract.ts`
- Create: `apps/backend/test/repository-contract/prisma-reference-seeder.ts`
- Create: `apps/backend/test/repository-contract/pin-time-zone.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.contract.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-check-in-repository.contract.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/mongo-check-in-repository.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { collection<T extends Document>(name: string): Collection<T> }`, `COLLECTIONS.CHECK_INS`, `COLLECTIONS.GYMS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `isDuplicateKeyError(error: unknown): error is MongoServerError`, `duplicateKeyFields(error: MongoServerError): string[]` de `@/shared/infra/database/connection/mongo/mongo-duplicate-key` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
  - `SHARED_TYPES.Mongo.Connection` de `@/shared/infra/ioc/types` (task-02)
  - `MongoUnitOfWork.isClientSession(obj: unknown): obj is ClientSession` e `new MongoUnitOfWork(connection)` com `runTransaction<T>(callback: Callback<T>): Promise<T>` (task-03)
  - `sessionOptions(session: ClientSession | undefined): { session?: ClientSession }` de `@/shared/infra/database/repository/unit-of-work/mongo-session` (task-03)
  - `escapeRegExp(text: string): string` de `@/shared/infra/database/repository/mongo/escape-regexp` (task-04)
  - `class IdRecorder { newId(): string; get ids(): readonly string[] }` de `test/repository-contract/id-recorder` (task-04)
  - `deleteDocumentsReferencing(connection, ids, targets)` de `test/mongo/delete-documents-referencing` (task-04)
- **Produz:**
  - `class MongoCheckInRepository implements CheckInRepository` (`@injectable()`, construtor `(connection: MongoConnection)`) e `type CheckInDocument` em `@/shared/infra/database/repository/mongo/mongo-check-in-repository`
  - `describeCheckInRepositoryContract(name: string, factory: () => Promise<CheckInRepositoryContractContext>): void` com `interface CheckInRepositoryContractContext { repository: CheckInRepository; newId(): string; ensureReferences(references: { userIds: string[]; gymIds: string[] }): Promise<void>; cleanup(): Promise<void> }` em `test/repository-contract/check-in-repository-contract`
  - `class PrismaReferenceSeeder { constructor(prisma: PrismaClient); ensureUsers(ids: readonly string[]): Promise<void>; ensureGyms(ids: readonly string[]): Promise<void>; ensurePlans(ids: readonly string[]): Promise<void>; cleanup(): Promise<void> }` em `test/repository-contract/prisma-reference-seeder` (cria linhas mínimas para satisfazer as FKs do Postgres e apaga, em ordem segura, tudo que referencia os ids criados)
  - `pinTimeZone(zone: string): () => void` em `test/repository-contract/pin-time-zone` (fixa `process.env.TZ`, falha se o worker não honrar e devolve a função que restaura)
  - Convenção do documento de check-in: `_id`, `created_at`, `validated_at`, `rejected_at`, `latitude`, `longitude`, `user_id`, `gym_id`, `updated_at`, `dayKey` (`YYYY-MM-DD` em UTC)

### Skills a invocar

- `typescript-advanced`: `CheckInDocument` como `type` alias, `UpdateFilter<CheckInDocument>` com `$set`/`$setOnInsert` sem cast e `Filter<CheckInDocument>` montado por status.
- `no-workarounds`: a unicidade por dia fica no índice (`dayKey`), não em um `find` seguido de `insert`; o código 11000 só vira `DuplicateCheckInError` quando o campo violado é `dayKey`, qualquer outro erro sobe como está.
- `test-antipatterns`: o fuso do processo é fixado explicitamente nos testes de meia-noite (nada de depender do fuso da máquina); INV-01 é provocado no banco real com duas inserções, não com um mock do repositório.

## Passos

- **Step 1: Confirm the Prisma field names used by the reference seeder**

Abrir `apps/backend/prisma/schema.prisma` e confirmar os nomes de campo do client gerado usados neste task: `user` (`id`, `name`, `email`, `role`, `status`), `gym` (`id`, `cnpj`, `title`, `latitude`, `longitude`, `status`), `plan` (`id`, `name`, `price_cents`, `billing_period`, `tagline`, `features`, `is_active`), `checkIn` (`user_id`, `gym_id`), `subscription` (`user_id`, `plan_id`), `notification` (`userId`), `userNotification` (`userId`), `userActivityEvent` (`userId`). Os modelos `notification`, `userNotification` e `userActivityEvent` usam campos camelCase no client, os demais usam snake_case. Se algum nome divergir, ajustar o `PrismaReferenceSeeder` abaixo antes de seguir.

- **Step 2: Write the failing tests (helpers, contract and Mongo specifics)**

`apps/backend/test/repository-contract/pin-time-zone.ts`:

```ts
export function pinTimeZone(zone: string): () => void {
	const previous = process.env.TZ
	process.env.TZ = zone
	if (new Date("2026-03-11T02:30:00.000Z").getDate() !== 10) {
		throw new Error(
			`The process time zone could not be pinned to ${zone}; run the integration config with the default forks pool`,
		)
	}
	return () => {
		if (previous === undefined) {
			Reflect.deleteProperty(process.env, "TZ")
			return
		}
		process.env.TZ = previous
	}
}
```

(`2026-03-11T02:30:00.000Z` é 23:30 do dia 10 em `America/Sao_Paulo`, que não tem horário de verão desde 2019; a checagem falha alto se o fuso não for honrado.)

`apps/backend/test/repository-contract/prisma-reference-seeder.ts`:

```ts
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"

function randomCnpj(): string {
	return Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join("")
}

export class PrismaReferenceSeeder {
	private readonly userIds = new Set<string>()
	private readonly gymIds = new Set<string>()
	private readonly planIds = new Set<string>()

	constructor(private readonly prisma: PrismaClient) {}

	public async ensureUsers(ids: readonly string[]): Promise<void> {
		for (const id of ids) {
			await this.prisma.user.create({
				data: {
					id,
					name: "Contract Reference",
					email: `${id}@reference.test`,
					role: "MEMBER",
					status: "activated",
				},
			})
			this.userIds.add(id)
		}
	}

	public async ensureGyms(ids: readonly string[]): Promise<void> {
		for (const id of ids) {
			await this.prisma.gym.create({
				data: {
					id,
					cnpj: randomCnpj(),
					title: "Contract Reference Gym",
					latitude: -23.5505,
					longitude: -46.6333,
					status: "activated",
				},
			})
			this.gymIds.add(id)
		}
	}

	public async ensurePlans(ids: readonly string[]): Promise<void> {
		for (const id of ids) {
			await this.prisma.plan.create({
				data: {
					id,
					name: "Contract Reference Plan",
					price_cents: 1000,
					billing_period: "monthly",
					tagline: "reference",
					features: [],
					is_active: true,
				},
			})
			this.planIds.add(id)
		}
	}

	public async cleanup(): Promise<void> {
		const userIds = [...this.userIds]
		const gymIds = [...this.gymIds]
		const planIds = [...this.planIds]
		await this.prisma.userActivityEvent.deleteMany({
			where: { userId: { in: userIds } },
		})
		await this.prisma.userNotification.deleteMany({
			where: { userId: { in: userIds } },
		})
		await this.prisma.notification.deleteMany({
			where: { userId: { in: userIds } },
		})
		await this.prisma.subscription.deleteMany({
			where: {
				OR: [{ user_id: { in: userIds } }, { plan_id: { in: planIds } }],
			},
		})
		await this.prisma.checkIn.deleteMany({
			where: {
				OR: [{ user_id: { in: userIds } }, { gym_id: { in: gymIds } }],
			},
		})
		await this.prisma.plan.deleteMany({ where: { id: { in: planIds } } })
		await this.prisma.gym.deleteMany({ where: { id: { in: gymIds } } })
		await this.prisma.user.deleteMany({ where: { id: { in: userIds } } })
		this.userIds.clear()
		this.gymIds.clear()
		this.planIds.clear()
	}
}
```

`apps/backend/test/repository-contract/check-in-repository-contract.ts`:

```ts
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { CheckInRepository } from "@/check-in/application/repository/check-in-repository"
import { CheckIn } from "@/check-in/domain/check-in"
import { pinTimeZone } from "./pin-time-zone"

export interface CheckInRepositoryContractContext {
	repository: CheckInRepository
	newId(): string
	ensureReferences(references: {
		userIds: string[]
		gymIds: string[]
	}): Promise<void>
	cleanup(): Promise<void>
}

type CheckInProps = Parameters<typeof CheckIn.restore>[0]

export function describeCheckInRepositoryContract(
	name: string,
	factory: () => Promise<CheckInRepositoryContractContext>,
): void {
	describe(`CheckInRepository contract (${name})`, () => {
		let context: CheckInRepositoryContractContext
		let restoreTimeZone: () => void
		let userId: string
		let gymId: string

		beforeAll(() => {
			restoreTimeZone = pinTimeZone("America/Sao_Paulo")
		})

		afterAll(() => {
			restoreTimeZone()
		})

		beforeEach(async () => {
			context = await factory()
			userId = context.newId()
			gymId = context.newId()
			await context.ensureReferences({ userIds: [userId], gymIds: [gymId] })
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildCheckIn(overrides: Partial<CheckInProps> = {}): CheckIn {
			return CheckIn.restore({
				id: context.newId(),
				gymId,
				userId,
				createdAt: new Date("2026-05-10T15:00:00.000Z"),
				userLatitude: -23.5505,
				userLongitude: -46.6333,
				...overrides,
			})
		}

		it("saves a check-in and finds it by id", async () => {
			const checkIn = buildCheckIn()

			const saved = await context.repository.save(checkIn)
			const found = await context.repository.checkOfById(checkIn.id)

			expect(saved).toEqual({ id: checkIn.id })
			expect(found?.userId).toBe(userId)
			expect(found?.gymId).toBe(gymId)
			expect(found?.createdAt.toISOString()).toBe("2026-05-10T15:00:00.000Z")
			expect(found?.status).toBe("pending")
		})

		it("returns null for an unknown id", async () => {
			expect(await context.repository.checkOfById(context.newId())).toBeNull()
		})

		it("saving an existing id again moves validatedAt", async () => {
			const checkIn = buildCheckIn()
			await context.repository.save(checkIn)

			await context.repository.save(
				buildCheckIn({
					id: checkIn.id,
					validatedAt: new Date("2026-05-10T15:10:00.000Z"),
				}),
			)

			const found = await context.repository.checkOfById(checkIn.id)
			expect(found?.status).toBe("validated")
			expect(found?.validatedAt?.toISOString()).toBe("2026-05-10T15:10:00.000Z")
		})

		it("onSameDateOfUserId is true only for the same user on the same local day", async () => {
			const otherUserId = context.newId()
			await context.ensureReferences({ userIds: [otherUserId], gymIds: [] })
			await context.repository.save(
				buildCheckIn({ createdAt: new Date("2026-05-10T15:00:00.000Z") }),
			)

			const sameDay = new Date("2026-05-10T23:00:00.000Z")
			const nextDay = new Date("2026-05-12T15:00:00.000Z")

			expect(await context.repository.onSameDateOfUserId(userId, sameDay)).toBe(true)
			expect(await context.repository.onSameDateOfUserId(userId, nextDay)).toBe(false)
			expect(await context.repository.onSameDateOfUserId(otherUserId, sameDay)).toBe(false)
		})

		it("onSameDateOfUserId uses the local calendar day near midnight (America/Sao_Paulo)", async () => {
			// 2026-03-11T02:30:00Z is 23:30 on March 10th in America/Sao_Paulo.
			await context.repository.save(
				buildCheckIn({ createdAt: new Date("2026-03-11T02:30:00.000Z") }),
			)

			// 22:00 on March 10th local: same local day, different UTC day.
			expect(
				await context.repository.onSameDateOfUserId(
					userId,
					new Date("2026-03-11T01:00:00.000Z"),
				),
			).toBe(true)
			// 00:30 on March 11th local: next local day, same UTC day.
			expect(
				await context.repository.onSameDateOfUserId(
					userId,
					new Date("2026-03-11T03:30:00.000Z"),
				),
			).toBe(false)
		})

		it("countByStatus counts pending, validated and rejected check-ins of a user", async () => {
			await context.repository.save(
				buildCheckIn({ createdAt: new Date("2026-05-01T15:00:00.000Z") }),
			)
			await context.repository.save(
				buildCheckIn({
					createdAt: new Date("2026-05-02T15:00:00.000Z"),
					validatedAt: new Date("2026-05-02T15:05:00.000Z"),
				}),
			)
			await context.repository.save(
				buildCheckIn({
					createdAt: new Date("2026-05-03T15:00:00.000Z"),
					rejectedAt: new Date("2026-05-03T15:05:00.000Z"),
				}),
			)

			const stats = await context.repository.countByStatus(userId)

			expect(stats).toEqual({ total: 3, pending: 1, validated: 1, rejected: 1 })
		})

		it("FR-012: findMany filters by user and status and reports the total", async () => {
			const pending = buildCheckIn({ createdAt: new Date("2026-05-01T15:00:00.000Z") })
			const validated = buildCheckIn({
				createdAt: new Date("2026-05-02T15:00:00.000Z"),
				validatedAt: new Date("2026-05-02T15:05:00.000Z"),
			})
			await context.repository.save(pending)
			await context.repository.save(validated)

			const all = await context.repository.findMany({
				page: 1,
				userId,
				sortOrder: "asc",
			})
			const onlyValidated = await context.repository.findMany({
				page: 1,
				userId,
				status: "validated",
				sortOrder: "asc",
			})

			expect(all.total).toBe(2)
			expect(all.items.map((item) => item.id)).toEqual([pending.id, validated.id])
			expect(onlyValidated.total).toBe(1)
			expect(onlyValidated.items.map((item) => item.id)).toEqual([validated.id])
		})

		it("FR-012: findMany orders by creation date ascending or descending", async () => {
			const first = buildCheckIn({ createdAt: new Date("2026-05-01T15:00:00.000Z") })
			const second = buildCheckIn({ createdAt: new Date("2026-05-02T15:00:00.000Z") })
			const third = buildCheckIn({ createdAt: new Date("2026-05-03T15:00:00.000Z") })
			await context.repository.save(second)
			await context.repository.save(first)
			await context.repository.save(third)

			const ascending = await context.repository.findMany({
				page: 1,
				userId,
				sortOrder: "asc",
			})
			const descending = await context.repository.findMany({
				page: 1,
				userId,
				sortOrder: "desc",
			})

			expect(ascending.items.map((item) => item.id)).toEqual([first.id, second.id, third.id])
			expect(descending.items.map((item) => item.id)).toEqual([third.id, second.id, first.id])
		})
	})
}
```

Invocadores:

`apps/backend/src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.contract.test.ts`:

```ts
import { describeCheckInRepositoryContract } from "test/repository-contract/check-in-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { InMemoryCheckInRepository } from "./in-memory-check-in-repository"

describeCheckInRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryCheckInRepository(),
		newId: () => recorder.newId(),
		ensureReferences: async () => {},
		cleanup: async () => {},
	}
})
```

`apps/backend/src/shared/infra/database/repository/prisma/prisma-check-in-repository.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { describeCheckInRepositoryContract } from "test/repository-contract/check-in-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaCheckInRepository } from "./prisma-check-in-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeCheckInRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)
	return {
		repository: new PrismaCheckInRepository(prismaClient),
		newId: () => recorder.newId(),
		ensureReferences: async ({ userIds, gymIds }) => {
			await seeder.ensureUsers(userIds)
			await seeder.ensureGyms(gymIds)
		},
		cleanup: () => seeder.cleanup(),
	}
})
```

`apps/backend/src/shared/infra/database/repository/mongo/mongo-check-in-repository.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { describeCheckInRepositoryContract } from "test/repository-contract/check-in-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { pinTimeZone } from "test/repository-contract/pin-time-zone"
import { DuplicateCheckInError } from "@/check-in/application/error/duplicate-check-in-error.js"
import { CheckIn } from "@/check-in/domain/check-in"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	duplicateKeyFields,
	isDuplicateKeyError,
} from "@/shared/infra/database/connection/mongo/mongo-duplicate-key"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { MongoCheckInRepository } from "./mongo-check-in-repository"

type CheckInProps = Parameters<typeof CheckIn.restore>[0]

describe("MongoCheckInRepository", () => {
	let connection: MongoConnection
	let repository: MongoCheckInRepository
	const recorder = new IdRecorder()

	function buildCheckIn(
		userId: string,
		overrides: Partial<CheckInProps> = {},
	): CheckIn {
		return CheckIn.restore({
			id: recorder.newId(),
			gymId: recorder.newId(),
			userId,
			createdAt: new Date("2026-05-10T15:00:00.000Z"),
			userLatitude: -23.5505,
			userLongitude: -46.6333,
			...overrides,
		})
	}

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.CHECK_INS, fields: ["_id", "user_id", "gym_id"] },
			{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
		])
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoCheckInRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeCheckInRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoCheckInRepository(connection),
			newId: () => contractRecorder.newId(),
			ensureReferences: async () => {},
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.CHECK_INS, fields: ["_id", "user_id", "gym_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-01: the unique index rejects a second check-in of the same user on the same UTC day", async () => {
			const userId = recorder.newId()
			const checkIns = connection.collection<Document>(COLLECTIONS.CHECK_INS)
			await checkIns.insertOne({
				_id: recorder.newId(),
				user_id: userId,
				dayKey: "2026-05-10",
			})

			const error = await checkIns
				.insertOne({ _id: recorder.newId(), user_id: userId, dayKey: "2026-05-10" })
				.then(
					() => undefined,
					(caught: unknown) => caught,
				)

			expect(isDuplicateKeyError(error)).toBe(true)
			if (!isDuplicateKeyError(error)) return
			expect(duplicateKeyFields(error)).toEqual(["user_id", "dayKey"])
		})

		it("INV-01: another user on the same day and the same user on another day are accepted", async () => {
			const userId = recorder.newId()
			await repository.save(buildCheckIn(userId))

			await expect(
				repository.save(buildCheckIn(recorder.newId())),
			).resolves.toBeDefined()
			await expect(
				repository.save(
					buildCheckIn(userId, { createdAt: new Date("2026-05-11T15:00:00.000Z") }),
				),
			).resolves.toBeDefined()
		})

		it("AC-02: a second check-in of the same user on the same day fails with DuplicateCheckInError", async () => {
			const userId = recorder.newId()
			await repository.save(buildCheckIn(userId))

			await expect(
				repository.save(
					buildCheckIn(userId, { createdAt: new Date("2026-05-10T20:00:00.000Z") }),
				),
			).rejects.toBeInstanceOf(DuplicateCheckInError)
		})

		it("stores dayKey as the UTC date of created_at", async () => {
			const userId = recorder.newId()
			const checkIn = buildCheckIn(userId, {
				createdAt: new Date("2026-03-11T02:30:00.000Z"),
			})
			await repository.save(checkIn)

			const document = await connection
				.collection<Document>(COLLECTIONS.CHECK_INS)
				.findOne({ _id: checkIn.id })

			expect(document).toMatchObject({
				_id: checkIn.id,
				user_id: userId,
				dayKey: "2026-03-11",
				validated_at: null,
				rejected_at: null,
			})
		})

		it("saving an existing id only moves validated_at and rejected_at", async () => {
			const userId = recorder.newId()
			const original = buildCheckIn(userId)
			await repository.save(original)

			await repository.save(
				buildCheckIn(userId, {
					id: original.id,
					gymId: original.gymId,
					createdAt: new Date("2026-05-10T18:00:00.000Z"),
					userLatitude: 10,
					validatedAt: new Date("2026-05-10T15:10:00.000Z"),
				}),
			)

			const found = await repository.checkOfById(original.id)
			expect(found?.createdAt.toISOString()).toBe("2026-05-10T15:00:00.000Z")
			expect(found?.latitude).toBeCloseTo(-23.5505, 6)
			expect(found?.validatedAt?.toISOString()).toBe("2026-05-10T15:10:00.000Z")
		})

		it("findMany filters by gym name, case-insensitively", async () => {
			const userId = recorder.newId()
			const gymId = recorder.newId()
			const otherGymId = recorder.newId()
			const token = randomUUID().slice(0, 8)
			await connection.collection<Document>(COLLECTIONS.GYMS).insertMany([
				{ _id: gymId, title: `${token} Central` },
				{ _id: otherGymId, title: "Unrelated Gym" },
			])
			const matching = buildCheckIn(userId, { gymId })
			const other = buildCheckIn(userId, {
				gymId: otherGymId,
				createdAt: new Date("2026-05-11T15:00:00.000Z"),
			})
			await repository.save(matching)
			await repository.save(other)

			const output = await repository.findMany({
				page: 1,
				userId,
				gymName: token.toUpperCase(),
			})

			expect(output.total).toBe(1)
			expect(output.items.map((item) => item.id)).toEqual([matching.id])
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("withTransaction writes inside the unit of work and rolls back when it fails", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const checkIn = buildCheckIn(recorder.newId())

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository.withTransaction(tx).save(checkIn)
					throw new Error("rollback")
				}),
			).rejects.toThrow("rollback")

			expect(await repository.checkOfById(checkIn.id)).toBeNull()
		})
	})

})
```

- **Step 3: Review Focus: Check-in perto da meia-noite, em que o dia local difere do dia UTC: `onSameDateOfUserId` e o índice único por `dayKey` devem concordar com o comportamento do Prisma, sem bloquear nem deixar passar um segundo check-in indevido — Write the failing test**

Dentro do `describe("MongoCheckInRepository", ...)` do mesmo arquivo `mongo-check-in-repository.integration-test.ts`, acrescentar (o fuso do processo é fixado em `America/Sao_Paulo`, UTC-3 sem horário de verão):

```ts
	describe("near midnight, local day differs from UTC day", () => {
		let restoreTimeZone: () => void

		beforeAll(() => {
			restoreTimeZone = pinTimeZone("America/Sao_Paulo")
		})

		afterAll(() => {
			restoreTimeZone()
		})

		afterEach(cleanup)

		it("Review Focus: same UTC day but another local day: onSameDateOfUserId is false and the unique index still refuses the second check-in, as Prisma does", async () => {
			const userId = recorder.newId()
			// 23:30 on March 10th local (02:30Z on the 11th) and 00:30 on March 11th local (03:30Z on the 11th).
			const lateEvening = new Date("2026-03-11T02:30:00.000Z")
			const afterMidnight = new Date("2026-03-11T03:30:00.000Z")
			await repository.save(buildCheckIn(userId, { createdAt: lateEvening }))

			expect(await repository.onSameDateOfUserId(userId, afterMidnight)).toBe(false)
			await expect(
				repository.save(buildCheckIn(userId, { createdAt: afterMidnight })),
			).rejects.toBeInstanceOf(DuplicateCheckInError)
		})

		it("Review Focus: same local day but another UTC day: onSameDateOfUserId is true and the unique index does not block the second check-in", async () => {
			const userId = recorder.newId()
			// 20:30 on March 11th local (23:30Z) and 21:30 on March 11th local (00:30Z on the 12th).
			const evening = new Date("2026-03-11T23:30:00.000Z")
			const laterEvening = new Date("2026-03-12T00:30:00.000Z")
			await repository.save(buildCheckIn(userId, { createdAt: evening }))

			expect(await repository.onSameDateOfUserId(userId, laterEvening)).toBe(true)
			await expect(
				repository.save(buildCheckIn(userId, { createdAt: laterEvening })),
			).resolves.toBeDefined()
		})
	})
```

O Postgres aplica o mesmo critério ao Prisma: o `onSameDateOfUserId` do caso de uso olha o dia local do processo e a restrição `UNIQUE (user_id, DATE(created_at))` olha o dia UTC gravado; os dois testes acima fixam que o Mongo concorda nos dois casos de divergência.

- **Step 4: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.contract.test.ts`
Expected: PASS (8 testes) se o in-memory já cumpre o contrato; qualquer falha é divergência do in-memory e se corrige lá, nunca relaxando o contrato.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-check-in-repository.contract.integration-test.ts`
Expected: PASS (8 testes) se o contrato descreve o comportamento atual do Prisma; falha indica contrato errado e se corrige no contrato.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-check-in-repository.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-check-in-repository""

- **Step 5: Write minimal implementation**

`apps/backend/src/shared/infra/database/repository/mongo/mongo-check-in-repository.ts`:

```ts
import { inject, injectable } from "inversify"
import type { ClientSession, Collection, Filter } from "mongodb"
import { DuplicateCheckInError } from "@/check-in/application/error/duplicate-check-in-error.js"
import type {
	CheckInRepository,
	CheckInStats,
	FindManyInput,
	FindManyOutput,
	SaveResponse,
} from "@/check-in/application/repository/check-in-repository"
import { CheckIn } from "@/check-in/domain/check-in"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	duplicateKeyFields,
	isDuplicateKeyError,
} from "@/shared/infra/database/connection/mongo/mongo-duplicate-key"
import { escapeRegExp } from "@/shared/infra/database/repository/mongo/escape-regexp"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { env } from "@/shared/infra/env"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

export type CheckInDocument = {
	_id: string
	created_at: Date
	validated_at: Date | null
	rejected_at: Date | null
	latitude: number
	longitude: number
	user_id: string
	gym_id: string
	updated_at: Date
	dayKey: string
}

type GymTitleDocument = { _id: string; title: string }

function utcDayKey(date: Date): string {
	return date.toISOString().slice(0, 10)
}

@injectable()
export class MongoCheckInRepository implements CheckInRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): CheckInRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoCheckInRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(checkIn: CheckIn): Promise<SaveResponse> {
		try {
			await this.checkIns().updateOne(
				{ _id: checkIn.id },
				{
					$set: {
						validated_at: checkIn.validatedAt ?? null,
						rejected_at: checkIn.rejectedAt ?? null,
						updated_at: new Date(),
					},
					$setOnInsert: {
						user_id: checkIn.userId,
						gym_id: checkIn.gymId,
						created_at: checkIn.createdAt,
						latitude: checkIn.latitude,
						longitude: checkIn.longitude,
						dayKey: utcDayKey(checkIn.createdAt),
					},
				},
				{ upsert: true, ...sessionOptions(this.session) },
			)
			return { id: checkIn.id }
		} catch (error) {
			throw this.mapSaveError(error)
		}
	}

	public async checkOfById(id: string): Promise<CheckIn | null> {
		const document = await this.checkIns().findOne(
			{ _id: id },
			sessionOptions(this.session),
		)
		return document ? this.createCheckIn(document) : null
	}

	public async onSameDateOfUserId(
		userId: string,
		date: Date,
	): Promise<boolean> {
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)
		const startOfNextDay = new Date(startOfDay)
		startOfNextDay.setDate(startOfNextDay.getDate() + 1)
		const count = await this.checkIns().countDocuments(
			{
				user_id: userId,
				created_at: { $gte: startOfDay, $lt: startOfNextDay },
			},
			sessionOptions(this.session),
		)
		return count > 0
	}

	public async countByStatus(userId?: string): Promise<CheckInStats> {
		const userFilter: Filter<CheckInDocument> = userId ? { user_id: userId } : {}
		const count = (filter: Filter<CheckInDocument>) =>
			this.checkIns().countDocuments(
				{ ...userFilter, ...filter },
				sessionOptions(this.session),
			)
		const [total, pending, validated, rejected] = await Promise.all([
			count({}),
			count({ validated_at: null, rejected_at: null }),
			count({ validated_at: { $ne: null }, rejected_at: null }),
			count({ rejected_at: { $ne: null } }),
		])
		return { total, pending, validated, rejected }
	}

	public async findMany(input: FindManyInput): Promise<FindManyOutput> {
		const filter = await this.buildFilter(input)
		const direction = input.sortOrder === "asc" ? 1 : -1
		const [documents, total] = await Promise.all([
			this.checkIns()
				.find(filter, sessionOptions(this.session))
				.sort({ created_at: direction, _id: direction })
				.skip((input.page - 1) * env.ITEMS_PER_PAGE)
				.limit(env.ITEMS_PER_PAGE)
				.toArray(),
			this.checkIns().countDocuments(filter, sessionOptions(this.session)),
		])
		return {
			items: documents.map((document) => this.createCheckIn(document)),
			total,
		}
	}

	private async buildFilter(
		input: FindManyInput,
	): Promise<Filter<CheckInDocument>> {
		const filter: Filter<CheckInDocument> = {}
		if (input.userId) filter.user_id = input.userId
		if (input.gymName) {
			const gyms = await this.connection
				.collection<GymTitleDocument>(COLLECTIONS.GYMS)
				.find(
					{ title: { $regex: escapeRegExp(input.gymName), $options: "i" } },
					{ projection: { _id: 1 }, ...sessionOptions(this.session) },
				)
				.toArray()
			filter.gym_id = { $in: gyms.map((gym) => gym._id) }
		}
		if (input.status === "pending") {
			filter.validated_at = null
			filter.rejected_at = null
		}
		if (input.status === "validated") {
			filter.validated_at = { $ne: null }
			filter.rejected_at = null
		}
		if (input.status === "rejected") {
			filter.rejected_at = { $ne: null }
		}
		return filter
	}

	private checkIns(): Collection<CheckInDocument> {
		return this.connection.collection<CheckInDocument>(COLLECTIONS.CHECK_INS)
	}

	private mapSaveError(error: unknown): unknown {
		if (isDuplicateKeyError(error) && duplicateKeyFields(error).includes("dayKey")) {
			return new DuplicateCheckInError()
		}
		return error
	}

	private createCheckIn(document: CheckInDocument): CheckIn {
		return CheckIn.restore({
			id: document._id,
			gymId: document.gym_id,
			userId: document.user_id,
			createdAt: document.created_at,
			validatedAt: document.validated_at ?? undefined,
			rejectedAt: document.rejected_at ?? undefined,
			userLatitude: document.latitude,
			userLongitude: document.longitude,
		})
	}
}
```

- **Step 6: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-check-in-repository.integration-test.ts`
Expected: PASS (18 testes: 8 do contrato, 8 específicos e 2 de Review Focus)

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.contract.test.ts`
Expected: PASS (8 testes)

- **Step 7: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/shared/infra/database/repository apps/backend/test/repository-contract
git commit -m "feat(backend): repositório de check-in no Mongo com unicidade por usuário e dia"
```

## Critérios de Sucesso

- INV-01 [db]: Um usuário tem no máximo um check-in por dia · Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-check-in-repository.integration-test.ts`
- AC-02 [int]: WHEN um e-mail, CNPJ ou check-in do dia repete THEN a resposta é a mesma do provider `prisma`
- Nesta task o AC-02 cobre apenas o check-in do dia: o segundo check-in do mesmo usuário no mesmo dia dá `DuplicateCheckInError`, o mesmo erro do Prisma.
- FR-004, FR-007: o `MongoCheckInRepository` cumpre a porta `CheckInRepository`, traduz o 11000 do índice `(user_id, dayKey)` para `DuplicateCheckInError` e deixa qualquer outro erro subir intacto.
- FR-012: `findMany` filtra por usuário, status e nome da academia, ordena por `created_at` e pagina como o Prisma.
- `save` é um upsert que só altera `validated_at` e `rejected_at` de um check-in existente.
- `describeCheckInRepositoryContract` passa em in-memory, Prisma e Mongo.
