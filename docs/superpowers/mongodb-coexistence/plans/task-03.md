# Task 3: MongoUnitOfWork com sessão transacional [FR-008]

**Status:** PENDING

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** capable

## Visão Geral

Esta task entrega o equivalente Mongo do `PrismaUnitOfWork`: `runTransaction` abre uma `ClientSession`, roda o callback dentro de `session.withTransaction` (que repete em `TransientTransactionError`) e passa a sessão como `tx`, o mesmo mecanismo que os repositórios usam hoje via `withTransaction(tx)`. Também entrega dois helpers pequenos que todos os repositórios Mongo das próximas tasks reutilizam: um que monta as opções de operação com a sessão e outro que executa um trabalho em transação própria quando o repositório não recebeu uma sessão.

## Arquivos

- Create: `apps/backend/src/shared/infra/database/repository/unit-of-work/mongo-unit-of-work.ts`
- Create: `apps/backend/src/shared/infra/database/repository/unit-of-work/mongo-session.ts`
- Test: `apps/backend/src/shared/infra/database/repository/unit-of-work/mongo-unit-of-work.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { client(): MongoClient; collection<T extends Document>(name: string): Collection<T> }` e `COLLECTIONS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `SHARED_TYPES.Mongo.Connection` de `@/shared/infra/ioc/types` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
- **Produz:**
  - `class MongoUnitOfWork implements UnitOfWork` (`@injectable()`, construtor `(connection: MongoConnection)` injetado com `SHARED_TYPES.Mongo.Connection`), com `static readonly MONGO_SESSION_SYMBOL: unique symbol`, `runTransaction<T>(callback: Callback<T>): Promise<T>` e `static isClientSession(obj: unknown): obj is ClientSession`, em `@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work`
  - `sessionOptions(session: ClientSession | undefined): { session?: ClientSession }` e `runInTransaction<T>(connection: MongoConnection, current: ClientSession | undefined, work: (session: ClientSession) => Promise<T>): Promise<T>`, em `@/shared/infra/database/repository/unit-of-work/mongo-session`

### Skills a invocar

- `typescript-advanced`: `isClientSession` é um type guard sobre `unknown`; `runInTransaction<T>` propaga o tipo de retorno do trabalho sem `any`.
- `no-workarounds`: sem `sleep` para esperar commit e sem engolir o erro do callback; a falha do callback tem de chegar ao chamador depois do rollback.
- `test-antipatterns`: o rollback e a retentativa são provados contra o MongoDB real em replica set, lendo as coleções depois; nenhum mock da sessão ou do driver.
- `context7`: confirmar na documentação do driver instalado a assinatura de `ClientSession.withTransaction` (o código abaixo assume que ela devolve o valor do callback; se a versão instalada devolver outra coisa, capturar o valor em uma variável local dentro do callback) e a retentativa em `TransientTransactionError`.

## Passos

- **Step 1: Write the failing test**

`apps/backend/src/shared/infra/database/repository/unit-of-work/mongo-unit-of-work.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { runInTransaction } from "./mongo-session"
import { MongoUnitOfWork } from "./mongo-unit-of-work"

describe("MongoUnitOfWork", () => {
	let connection: MongoConnection
	let sut: MongoUnitOfWork
	const checkInIds: string[] = []
	const subscriptionIds: string[] = []

	function checkInDocument(id: string): Document {
		return {
			_id: id,
			user_id: randomUUID(),
			dayKey: "2000-01-01",
			created_at: new Date("2000-01-01T12:00:00.000Z"),
		}
	}

	function subscriptionDocument(id: string): Document {
		return {
			_id: id,
			user_id: randomUUID(),
			billing_subscription_id: `billing-${id}`,
			status: "canceled",
		}
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		sut = new MongoUnitOfWork(connection)
	})

	afterEach(async () => {
		await connection
			.collection<Document>(COLLECTIONS.CHECK_INS)
			.deleteMany({ _id: { $in: checkInIds.splice(0) } })
		await connection
			.collection<Document>(COLLECTIONS.SUBSCRIPTIONS)
			.deleteMany({ _id: { $in: subscriptionIds.splice(0) } })
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("AC-03: nothing stays written when a step fails inside runTransaction", async () => {
		const checkIns = connection.collection<Document>(COLLECTIONS.CHECK_INS)
		const subscriptions = connection.collection<Document>(
			COLLECTIONS.SUBSCRIPTIONS,
		)
		const checkInId = randomUUID()
		const subscriptionId = randomUUID()
		checkInIds.push(checkInId)
		subscriptionIds.push(subscriptionId)

		await expect(
			sut.runTransaction(async (tx) => {
				if (!MongoUnitOfWork.isClientSession(tx)) {
					throw new Error("expected a Mongo session")
				}
				await checkIns.insertOne(checkInDocument(checkInId), { session: tx })
				await subscriptions.insertOne(subscriptionDocument(subscriptionId), {
					session: tx,
				})
				throw new Error("step failed")
			}),
		).rejects.toThrow("step failed")

		expect(await checkIns.countDocuments({ _id: checkInId })).toBe(0)
		expect(await subscriptions.countDocuments({ _id: subscriptionId })).toBe(0)
	})

	it("FR-008: commits every write when the callback succeeds and returns its value", async () => {
		const checkIns = connection.collection<Document>(COLLECTIONS.CHECK_INS)
		const subscriptions = connection.collection<Document>(
			COLLECTIONS.SUBSCRIPTIONS,
		)
		const checkInId = randomUUID()
		const subscriptionId = randomUUID()
		checkInIds.push(checkInId)
		subscriptionIds.push(subscriptionId)

		const result = await sut.runTransaction(async (tx) => {
			if (!MongoUnitOfWork.isClientSession(tx)) {
				throw new Error("expected a Mongo session")
			}
			await checkIns.insertOne(checkInDocument(checkInId), { session: tx })
			await subscriptions.insertOne(subscriptionDocument(subscriptionId), {
				session: tx,
			})
			return "done"
		})

		expect(result).toBe("done")
		expect(await checkIns.countDocuments({ _id: checkInId })).toBe(1)
		expect(await subscriptions.countDocuments({ _id: subscriptionId })).toBe(1)
	})

	it("FR-008: retries the callback on a transient write conflict until both increments persist", async () => {
		const checkIns = connection.collection<Document>(COLLECTIONS.CHECK_INS)
		const counterId = randomUUID()
		checkInIds.push(counterId)
		await checkIns.insertOne({ ...checkInDocument(counterId), n: 0 })
		let attempts = 0

		const increment = (holdMs: number) =>
			sut.runTransaction(async (tx) => {
				if (!MongoUnitOfWork.isClientSession(tx)) {
					throw new Error("expected a Mongo session")
				}
				attempts += 1
				await checkIns.updateOne(
					{ _id: counterId },
					{ $inc: { n: 1 } },
					{ session: tx },
				)
				await new Promise((resolve) => setTimeout(resolve, holdMs))
			})

		const first = increment(300)
		await new Promise((resolve) => setTimeout(resolve, 50))
		const second = increment(0)
		await Promise.all([first, second])

		const counter = await checkIns.findOne({ _id: counterId })
		expect(counter?.n).toBe(2)
		expect(attempts).toBeGreaterThan(2)
	}, 30_000)

	it("isClientSession accepts only sessions created by runTransaction", async () => {
		const rawSession = connection.client().startSession()
		try {
			expect(MongoUnitOfWork.isClientSession(rawSession)).toBe(false)
		} finally {
			await rawSession.endSession()
		}
		expect(MongoUnitOfWork.isClientSession({})).toBe(false)
		expect(MongoUnitOfWork.isClientSession(undefined)).toBe(false)

		let seen = false
		await sut.runTransaction(async (tx) => {
			seen = MongoUnitOfWork.isClientSession(tx)
		})
		expect(seen).toBe(true)
	})

	it("runInTransaction reuses the session it is given", async () => {
		await sut.runTransaction(async (tx) => {
			if (!MongoUnitOfWork.isClientSession(tx)) {
				throw new Error("expected a Mongo session")
			}
			const received = await runInTransaction(connection, tx, async (session) => session)
			expect(received).toBe(tx)
		})
	})

	it("runInTransaction opens its own transaction and rolls back when no session is given", async () => {
		const checkIns = connection.collection<Document>(COLLECTIONS.CHECK_INS)
		const rolledBackId = randomUUID()
		const committedId = randomUUID()
		checkInIds.push(rolledBackId, committedId)

		await expect(
			runInTransaction(connection, undefined, async (session) => {
				await checkIns.insertOne(checkInDocument(rolledBackId), { session })
				throw new Error("own transaction failed")
			}),
		).rejects.toThrow("own transaction failed")
		await runInTransaction(connection, undefined, (session) =>
			checkIns.insertOne(checkInDocument(committedId), { session }),
		)

		expect(await checkIns.countDocuments({ _id: rolledBackId })).toBe(0)
		expect(await checkIns.countDocuments({ _id: committedId })).toBe(1)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/unit-of-work/mongo-unit-of-work.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-session"" (os módulos ainda não existem)

- **Step 3: Write minimal implementation**

`apps/backend/src/shared/infra/database/repository/unit-of-work/mongo-session.ts`:

```ts
import type { ClientSession } from "mongodb"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"

export function sessionOptions(session: ClientSession | undefined): {
	session?: ClientSession
} {
	return session ? { session } : {}
}

export async function runInTransaction<T>(
	connection: MongoConnection,
	current: ClientSession | undefined,
	work: (session: ClientSession) => Promise<T>,
): Promise<T> {
	if (current) return work(current)
	const session = connection.client().startSession()
	try {
		return await session.withTransaction(() => work(session))
	} finally {
		await session.endSession()
	}
}
```

`apps/backend/src/shared/infra/database/repository/unit-of-work/mongo-unit-of-work.ts`:

```ts
import { inject, injectable } from "inversify"
import { ClientSession } from "mongodb"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Callback, UnitOfWork } from "./unit-of-work"

@injectable()
export class MongoUnitOfWork implements UnitOfWork {
	public static readonly MONGO_SESSION_SYMBOL = Symbol("MONGO_SESSION")

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async runTransaction<T>(callback: Callback<T>): Promise<T> {
		const session = this.connection.client().startSession()
		Object.defineProperty(session, MongoUnitOfWork.MONGO_SESSION_SYMBOL, {
			value: true,
		})
		try {
			return await session.withTransaction(() => callback(session))
		} finally {
			await session.endSession()
		}
	}

	public static isClientSession(obj: unknown): obj is ClientSession {
		return (
			obj instanceof ClientSession &&
			Reflect.get(obj, MongoUnitOfWork.MONGO_SESSION_SYMBOL) === true
		)
	}
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/unit-of-work/mongo-unit-of-work.integration-test.ts`
Expected: PASS (6 testes; exige `mongodb-dev` de pé)

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/shared/infra/database/repository/unit-of-work
git commit -m "feat(backend): MongoUnitOfWork com sessão transacional e retentativa transitória"
```

## Critérios de Sucesso

- AC-03 [int]: WHEN o check-in grava dentro do `UnitOfWork` e uma etapa falha THEN nada fica gravado
- Risco: Tecnologia nova para o time: transações e geo no Mongo
- FR-008: `runTransaction` confirma todas as escritas quando o callback termina e devolve o valor do callback; em conflito transitório de escrita o callback é repetido até as duas transações persistirem.
- `isClientSession` só aceita a sessão criada por `runTransaction`; `runInTransaction` reaproveita a sessão recebida ou abre e encerra a sua própria.
