# Task 2: MongoConnection, índices, falha na inicialização e health do banco [FR-017, FR-018]

**Status:** PENDING

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** capable

## Visão Geral

Esta task cria o ponto único de acesso ao MongoDB: `MongoConnection` abre o `MongoClient`, faz ping, recusa um MongoDB sem replica set (as transações das tasks seguintes dependem dele) e cria todos os índices únicos e de consulta que sustentam as regras de unicidade. Também entrega o health check do provider `mongo`, os helpers de código de erro 11000 que os repositórios usarão para traduzir violações de unicidade, o helper de teste que abre uma conexão real e os símbolos IoC. A ligação condicional no container fica para a task de seleção por provider.

## Arquivos

- Create: `apps/backend/src/shared/infra/database/connection/mongo/mongo-connection.ts`
- Create: `apps/backend/src/shared/infra/database/connection/mongo/mongo-duplicate-key.ts`
- Create: `apps/backend/src/shared/infra/errors/mongo-unavailable-error.ts`
- Create: `apps/backend/src/shared/infra/errors/mongo-transactions-unsupported-error.ts`
- Create: `apps/backend/src/shared/infra/health/database/mongo-database-health-provider.ts`
- Create: `apps/backend/test/mongo/create-test-mongo-connection.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/shared-types.ts`
- Modify: `apps/backend/compose.yaml`
- Test: `apps/backend/src/shared/infra/database/connection/mongo/mongo-connection.test.ts`
- Test: `apps/backend/src/shared/infra/database/connection/mongo/mongo-connection.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/connection/mongo/mongo-duplicate-key.integration-test.ts`
- Test: `apps/backend/src/shared/infra/health/database/mongo-database-health-provider.integration-test.ts`

## Interfaces

- **Consome:** `env.DATABASE_URL_MONGO: string | undefined` e o serviço compose `mongodb` com replica set `rs0` em `127.0.0.1:27017` (task-01)
- **Produz:**
  - `COLLECTIONS` (`USERS: "users"`, `GYMS: "gyms"`, `CHECK_INS: "check_ins"`, `SUBSCRIPTIONS: "subscriptions"`, `PLANS: "plans"`, `STRIPE_WEBHOOK_EVENTS: "stripe_webhook_events"`, `NOTIFICATIONS: "notifications"`, `USER_NOTIFICATIONS: "user_notifications"`, `USER_ACTIVITY_EVENTS: "user_activity_events"`) e `type CollectionName`, exportados de `@/shared/infra/database/connection/mongo/mongo-connection`
  - `class MongoConnection { constructor(url: string, dbName?: string); connect(): Promise<void>; ping(): Promise<void>; assertTransactionsSupported(): Promise<void>; ensureIndexes(): Promise<void>; collection<T extends Document>(name: string): Collection<T>; client(): MongoClient; disconnect(): Promise<void> }`
  - `supportsTransactions(hello: Document): boolean` (mesmo módulo)
  - `MongoUnavailableError`, `MongoTransactionsUnsupportedError` (`@/shared/infra/errors/mongo-unavailable-error`, `@/shared/infra/errors/mongo-transactions-unsupported-error`), ambos `extends Error` com mensagem que cita `--replSet`
  - `isDuplicateKeyError(error: unknown): error is MongoServerError` e `duplicateKeyFields(error: MongoServerError): string[]` (`@/shared/infra/database/connection/mongo/mongo-duplicate-key`)
  - `MongoDatabaseHealthProvider` (`name = "database"`, `check(): Promise<ServiceHealth>`, metadata `{ provider: "mongo", database: "mongodb" }`) em `@/shared/infra/health/database/mongo-database-health-provider`
  - `SHARED_TYPES.Mongo.Connection` e `SHARED_TYPES.Mongo.UnitOfWork` (símbolos IoC; ainda sem bind)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` em `apps/backend/test/mongo/create-test-mongo-connection.ts` (conecta, valida transações e cria índices; lança se `DATABASE_URL_MONGO` faltar, nunca pula)
  - Nomes de índice criados por `ensureIndexes()`: `users_email_unique`, `users_google_id_unique`, `users_billing_customer_id_unique`, `gyms_cnpj_unique`, `gyms_location_2dsphere`, `check_ins_user_day_unique`, `check_ins_user_created_at`, `subscriptions_billing_subscription_id_unique`, `subscriptions_user_id_active_unique`, `stripe_webhook_events_event_id_unique`, `notifications_user_id`, `user_notifications_user_id`, `user_activity_events_user_occurred_at`

### Skills a invocar

- `typescript-advanced`: `Collection<T extends Document>` e os tipos de `IndexDescription`/`MongoServerError` do driver precisam ser usados sem casts; `COLLECTIONS` com `as const` gera o tipo `CollectionName`.
- `no-workarounds`: a falta de replica set deve ser detectada na inicialização por `hello`, não descoberta na primeira transação; nada de `try/catch` que engole o erro do driver sem `cause`.
- `test-antipatterns`: os testes falam com o MongoDB real do compose (e com um standalone real para o caso sem replica set); o driver não é mockado e nenhum teste se auto-pula quando o serviço falta.
- `context7`: confirmar na documentação do driver `mongodb` instalado a forma de `createIndexes`, `partialFilterExpression`, o comando `hello`, `MongoServerError#keyPattern` e as opções `serverSelectionTimeoutMS` / `directConnection`.

## Passos

- **Step 1: Write the failing tests (unit, health, duplicate key, indexes)**

Os testes importam o helper de teste via alias `test/...`; confirmar o alias com um import existente (por exemplo `test/factory/create-and-save-user`) antes de seguir.

`apps/backend/src/shared/infra/database/connection/mongo/mongo-connection.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { supportsTransactions } from "./mongo-connection"

describe("supportsTransactions", () => {
	it("accepts a replica set member", () => {
		expect(
			supportsTransactions({ setName: "rs0", isWritablePrimary: true }),
		).toBe(true)
	})

	it("accepts a mongos router", () => {
		expect(supportsTransactions({ msg: "isdbgrid" })).toBe(true)
	})

	it("rejects a standalone server", () => {
		expect(supportsTransactions({ isWritablePrimary: true })).toBe(false)
	})
})
```

`apps/backend/src/shared/infra/database/connection/mongo/mongo-duplicate-key.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { COLLECTIONS, type MongoConnection } from "./mongo-connection"
import { duplicateKeyFields, isDuplicateKeyError } from "./mongo-duplicate-key"

describe("mongo duplicate key helpers", () => {
	let connection: MongoConnection
	const createdIds: string[] = []

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterEach(async () => {
		await connection
			.collection<Document>(COLLECTIONS.USERS)
			.deleteMany({ _id: { $in: createdIds.splice(0) } })
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("recognises a real unique index violation and reports the violated field", async () => {
		const users = connection.collection<Document>(COLLECTIONS.USERS)
		const email = `${randomUUID()}@duplicate-key.test`
		const firstId = randomUUID()
		const secondId = randomUUID()
		createdIds.push(firstId, secondId)
		await users.insertOne({ _id: firstId, email })

		const error = await users
			.insertOne({ _id: secondId, email })
			.catch((caught: unknown) => caught)

		expect(isDuplicateKeyError(error)).toBe(true)
		if (!isDuplicateKeyError(error)) return
		expect(duplicateKeyFields(error)).toEqual(["email"])
	})

	it("does not classify unrelated errors as duplicate key errors", () => {
		expect(isDuplicateKeyError(new Error("boom"))).toBe(false)
		expect(isDuplicateKeyError(undefined)).toBe(false)
	})
})
```

`apps/backend/src/shared/infra/health/database/mongo-database-health-provider.integration-test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoDatabaseHealthProvider } from "./mongo-database-health-provider"

describe("MongoDatabaseHealthProvider", () => {
	let connection: MongoConnection

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("FR-018: reports up with the mongo metadata when the database answers", async () => {
		const sut = new MongoDatabaseHealthProvider(connection)
		const health = await sut.check()
		expect(health.name).toBe("database")
		expect(health.status).toBe("up")
		expect(health.metadata).toEqual({ provider: "mongo", database: "mongodb" })
	})

	it("FR-018: reports down with the error message when the database is unreachable", async () => {
		const unreachable = new MongoConnection(
			"mongodb://127.0.0.1:1/test?directConnection=true",
		)
		const sut = new MongoDatabaseHealthProvider(unreachable)
		const health = await sut.check()
		await unreachable.disconnect()
		expect(health.status).toBe("down")
		expect(health.error).toEqual(expect.any(String))
	}, 20_000)
})
```

No arquivo `mongo-connection.integration-test.ts`, escrever (o bloco de Review Focus vem no passo seguinte):

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { COLLECTIONS, type MongoConnection } from "./mongo-connection"

async function indexNames(
	connection: MongoConnection,
	collectionName: string,
): Promise<string[]> {
	const indexes = await connection.collection(collectionName).indexes()
	return indexes.flatMap((index) => (index.name ? [index.name] : []))
}

describe("MongoConnection", () => {
	let connection: MongoConnection

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("AC-05: accepts the replica set started by the compose file", async () => {
		await expect(connection.assertTransactionsSupported()).resolves.toBeUndefined()
	})

	it("creates the unique and query indexes of every collection", async () => {
		await connection.ensureIndexes()
		expect(await indexNames(connection, COLLECTIONS.USERS)).toEqual(
			expect.arrayContaining([
				"users_email_unique",
				"users_google_id_unique",
				"users_billing_customer_id_unique",
			]),
		)
		expect(await indexNames(connection, COLLECTIONS.GYMS)).toEqual(
			expect.arrayContaining(["gyms_cnpj_unique", "gyms_location_2dsphere"]),
		)
		expect(await indexNames(connection, COLLECTIONS.CHECK_INS)).toEqual(
			expect.arrayContaining([
				"check_ins_user_day_unique",
				"check_ins_user_created_at",
			]),
		)
		expect(await indexNames(connection, COLLECTIONS.SUBSCRIPTIONS)).toEqual(
			expect.arrayContaining([
				"subscriptions_billing_subscription_id_unique",
				"subscriptions_user_id_active_unique",
			]),
		)
		expect(
			await indexNames(connection, COLLECTIONS.STRIPE_WEBHOOK_EVENTS),
		).toContain("stripe_webhook_events_event_id_unique")
		expect(await indexNames(connection, COLLECTIONS.NOTIFICATIONS)).toContain(
			"notifications_user_id",
		)
		expect(
			await indexNames(connection, COLLECTIONS.USER_NOTIFICATIONS),
		).toContain("user_notifications_user_id")
		expect(
			await indexNames(connection, COLLECTIONS.USER_ACTIVITY_EVENTS),
		).toContain("user_activity_events_user_occurred_at")
	})

	it("ensureIndexes is idempotent", async () => {
		await connection.ensureIndexes()
		await expect(connection.ensureIndexes()).resolves.toBeUndefined()
	})
})
```

- **Step 2: Review Focus: MongoDB standalone (sem replica set) ou indisponível: a API falha na inicialização com mensagem que cita o `--replSet`, nunca sobe e quebra só na primeira transação — Write the failing test**

Acrescentar ao mesmo `mongo-connection.integration-test.ts` (imports adicionais: `MongoConnection` como valor, `MongoTransactionsUnsupportedError` e `MongoUnavailableError`):

```ts
import { MongoTransactionsUnsupportedError } from "@/shared/infra/errors/mongo-transactions-unsupported-error"
import { MongoUnavailableError } from "@/shared/infra/errors/mongo-unavailable-error"
import { MongoConnection } from "./mongo-connection"

const STANDALONE_URL =
	process.env.DATABASE_URL_MONGO_STANDALONE ??
	"mongodb://127.0.0.1:27018/test?directConnection=true"

describe("MongoConnection startup failures", () => {
	it("AC-05: connect rejects with MongoUnavailableError citing --replSet when MongoDB is unreachable", async () => {
		const unreachable = new MongoConnection(
			"mongodb://127.0.0.1:1/test?directConnection=true",
		)
		const error = await unreachable.connect().catch((caught: unknown) => caught)
		await unreachable.disconnect()
		expect(error).toBeInstanceOf(MongoUnavailableError)
		expect((error as Error).message).toContain("--replSet")
	}, 20_000)

	it("AC-05: assertTransactionsSupported rejects citing --replSet on a standalone MongoDB, before any transaction runs", async () => {
		const standalone = new MongoConnection(STANDALONE_URL)
		await standalone.connect()
		try {
			const error = await standalone
				.assertTransactionsSupported()
				.catch((caught: unknown) => caught)
			expect(error).toBeInstanceOf(MongoTransactionsUnsupportedError)
			expect((error as Error).message).toContain("--replSet")
		} finally {
			await standalone.disconnect()
		}
	}, 20_000)
})
```

(`(error as Error)` aparece só depois de `toBeInstanceOf` ter provado o tipo; se o Biome reclamar do cast, trocar por `if (!(error instanceof Error)) throw error` antes do `expect`.)

- **Step 3: Start the standalone MongoDB used by the Review Focus test**

Em `apps/backend/compose.yaml`, adicionar o serviço abaixo (profile `standalone`, não sobe com `docker:up`):

```yaml
  mongodb-standalone:
    container_name: "mongodb-standalone-test"
    image: mongo:8
    profiles: ["standalone"]
    ports:
      - "127.0.0.1:27018:27017"
```

Run: `cd apps/backend && docker compose -f compose.yaml --profile standalone up -d mongodb-standalone`
Expected: container `mongodb-standalone-test` criado e em execução

Run: `cd apps/backend && docker compose -f compose.yaml up -d mongodb`
Expected: container `mongodb-dev` em execução e `healthy` (as integrações usam `DATABASE_URL_MONGO` de `.env.test`)

- **Step 4: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/connection/mongo/mongo-connection.test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-connection""

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/connection/mongo/mongo-connection.integration-test.ts`
Expected: FAIL with "Failed to resolve import" (módulo `mongo-connection` e helper `test/mongo/create-test-mongo-connection` ainda não existem)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/connection/mongo/mongo-duplicate-key.integration-test.ts`
Expected: FAIL with "Failed to resolve import"

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/health/database/mongo-database-health-provider.integration-test.ts`
Expected: FAIL with "Failed to resolve import"

- **Step 5: Write minimal implementation**

`apps/backend/src/shared/infra/errors/mongo-unavailable-error.ts`:

```ts
export class MongoUnavailableError extends Error {
	constructor(options?: ErrorOptions) {
		super(
			"MongoDB indisponível: confirme que o serviço está no ar (pnpm docker:up) e que DATABASE_URL_MONGO está correto. O MongoDB precisa rodar em replica set (--replSet) para suportar transações.",
			options,
		)
		this.name = "MongoUnavailableError"
	}
}
```

`apps/backend/src/shared/infra/errors/mongo-transactions-unsupported-error.ts`:

```ts
export class MongoTransactionsUnsupportedError extends Error {
	constructor() {
		super(
			"O MongoDB conectado não suporta transações: inicie o mongod com --replSet (replica set de um nó) e execute rs.initiate(). O serviço mongodb do compose.yaml já faz isso.",
		)
		this.name = "MongoTransactionsUnsupportedError"
	}
}
```

`apps/backend/src/shared/infra/database/connection/mongo/mongo-duplicate-key.ts`:

```ts
import { MongoServerError } from "mongodb"

const DUPLICATE_KEY_ERROR_CODE = 11000

export function isDuplicateKeyError(error: unknown): error is MongoServerError {
	return (
		error instanceof MongoServerError &&
		error.code === DUPLICATE_KEY_ERROR_CODE
	)
}

export function duplicateKeyFields(error: MongoServerError): string[] {
	return Object.keys(error.keyPattern ?? {})
}
```

`apps/backend/src/shared/infra/database/connection/mongo/mongo-connection.ts`:

```ts
import { type Collection, type Document, MongoClient } from "mongodb"
import { MongoTransactionsUnsupportedError } from "@/shared/infra/errors/mongo-transactions-unsupported-error"
import { MongoUnavailableError } from "@/shared/infra/errors/mongo-unavailable-error"

const SERVER_SELECTION_TIMEOUT_MS = 5000

export const COLLECTIONS = {
	USERS: "users",
	GYMS: "gyms",
	CHECK_INS: "check_ins",
	SUBSCRIPTIONS: "subscriptions",
	PLANS: "plans",
	STRIPE_WEBHOOK_EVENTS: "stripe_webhook_events",
	NOTIFICATIONS: "notifications",
	USER_NOTIFICATIONS: "user_notifications",
	USER_ACTIVITY_EVENTS: "user_activity_events",
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]

export function supportsTransactions(hello: Document): boolean {
	return typeof hello.setName === "string" || hello.msg === "isdbgrid"
}

export class MongoConnection {
	private readonly mongoClient: MongoClient

	constructor(
		url: string,
		private readonly dbName?: string,
	) {
		this.mongoClient = new MongoClient(url, {
			serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
		})
	}

	public async connect(): Promise<void> {
		try {
			await this.mongoClient.connect()
			await this.ping()
		} catch (error) {
			throw new MongoUnavailableError({ cause: error })
		}
	}

	public async ping(): Promise<void> {
		await this.mongoClient.db(this.dbName).command({ ping: 1 })
	}

	public async assertTransactionsSupported(): Promise<void> {
		const hello = await this.mongoClient
			.db(this.dbName)
			.admin()
			.command({ hello: 1 })
		if (!supportsTransactions(hello)) {
			throw new MongoTransactionsUnsupportedError()
		}
	}

	public async ensureIndexes(): Promise<void> {
		await Promise.all([
			this.collection(COLLECTIONS.USERS).createIndexes([
				{ key: { email: 1 }, name: "users_email_unique", unique: true },
				{
					key: { google_id: 1 },
					name: "users_google_id_unique",
					unique: true,
					partialFilterExpression: { google_id: { $type: "string" } },
				},
				{
					key: { billing_customer_id: 1 },
					name: "users_billing_customer_id_unique",
					unique: true,
					partialFilterExpression: {
						billing_customer_id: { $type: "string" },
					},
				},
			]),
			this.collection(COLLECTIONS.GYMS).createIndexes([
				{ key: { cnpj: 1 }, name: "gyms_cnpj_unique", unique: true },
				{ key: { location: "2dsphere" }, name: "gyms_location_2dsphere" },
			]),
			this.collection(COLLECTIONS.CHECK_INS).createIndexes([
				{
					key: { user_id: 1, dayKey: 1 },
					name: "check_ins_user_day_unique",
					unique: true,
				},
				{
					key: { user_id: 1, created_at: -1 },
					name: "check_ins_user_created_at",
				},
			]),
			this.collection(COLLECTIONS.SUBSCRIPTIONS).createIndexes([
				{
					key: { billing_subscription_id: 1 },
					name: "subscriptions_billing_subscription_id_unique",
					unique: true,
				},
				{
					key: { user_id: 1 },
					name: "subscriptions_user_id_active_unique",
					unique: true,
					partialFilterExpression: { status: "active" },
				},
			]),
			this.collection(COLLECTIONS.STRIPE_WEBHOOK_EVENTS).createIndexes([
				{
					key: { event_id: 1 },
					name: "stripe_webhook_events_event_id_unique",
					unique: true,
				},
			]),
			this.collection(COLLECTIONS.NOTIFICATIONS).createIndexes([
				{ key: { user_id: 1 }, name: "notifications_user_id" },
			]),
			this.collection(COLLECTIONS.USER_NOTIFICATIONS).createIndexes([
				{ key: { user_id: 1 }, name: "user_notifications_user_id" },
			]),
			this.collection(COLLECTIONS.USER_ACTIVITY_EVENTS).createIndexes([
				{
					key: { user_id: 1, occurred_at: -1 },
					name: "user_activity_events_user_occurred_at",
				},
			]),
		])
	}

	public collection<T extends Document>(name: string): Collection<T> {
		return this.mongoClient.db(this.dbName).collection<T>(name)
	}

	public client(): MongoClient {
		return this.mongoClient
	}

	public async disconnect(): Promise<void> {
		await this.mongoClient.close()
	}
}
```

`apps/backend/src/shared/infra/health/database/mongo-database-health-provider.ts`:

```ts
import { inject, injectable } from "inversify"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import type {
	HealthProvider,
	ServiceHealth,
} from "@/shared/infra/health/health-check"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

@injectable()
export class MongoDatabaseHealthProvider implements HealthProvider {
	public readonly name = "database"

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async check(): Promise<ServiceHealth> {
		const startTime = Date.now()
		try {
			await this.connection.ping()
			return this.createServiceHealthResponse("up", startTime)
		} catch (error) {
			return this.createServiceHealthResponse("down", startTime, error)
		}
	}

	private createServiceHealthResponse(
		status: ServiceHealth["status"],
		startTime: number,
		error?: unknown,
	): ServiceHealth {
		const response: ServiceHealth = {
			name: this.name,
			status,
			responseTime: Date.now() - startTime,
			lastCheck: new Date().toISOString(),
			metadata: {
				provider: "mongo",
				database: "mongodb",
			},
		}
		if (error && status === "down") {
			response.error =
				error instanceof Error ? error.message : "Unknown database error"
		}
		return response
	}
}
```

Em `shared-types.ts`, acrescentar após `Prisma`:

```ts
	Mongo: {
		Connection: Symbol.for("MongoConnection"),
		UnitOfWork: Symbol.for("MongoUnitOfWork"),
	},
```

`apps/backend/test/mongo/create-test-mongo-connection.ts`:

```ts
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { env } from "@/shared/infra/env"

export async function createTestMongoConnection(
	dbName?: string,
): Promise<MongoConnection> {
	const url = env.DATABASE_URL_MONGO
	if (!url) {
		throw new Error(
			"DATABASE_URL_MONGO is required for the Mongo integration tests (see .env.test)",
		)
	}
	const connection = new MongoConnection(url, dbName)
	await connection.connect()
	await connection.assertTransactionsSupported()
	await connection.ensureIndexes()
	return connection
}
```

Se `HealthProvider`/`ServiceHealth` não forem exportados de `@/shared/infra/health/health-check`, usar o mesmo caminho relativo do `database-health-provider.ts` existente (`../health-check`).

- **Step 6: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/connection/mongo/mongo-connection.test.ts`
Expected: PASS (3 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/connection/mongo/mongo-connection.integration-test.ts`
Expected: PASS (5 testes; exige `mongodb-dev` e `mongodb-standalone-test` de pé)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/connection/mongo/mongo-duplicate-key.integration-test.ts`
Expected: PASS (2 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/health/database/mongo-database-health-provider.integration-test.ts`
Expected: PASS (2 testes)

- **Step 7: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/shared/infra apps/backend/test/mongo apps/backend/compose.yaml
git commit -m "feat(backend): MongoConnection com índices, validação de replica set e health do mongo"
```

## Critérios de Sucesso

- AC-05 [int]: WHEN o Mongo está fora ou sem replica set THEN a API falha na inicialização com mensagem clara
- Risco: Replica set mal configurado no compose
- `MongoConnection.connect()` rejeita com `MongoUnavailableError` e `assertTransactionsSupported()` rejeita com `MongoTransactionsUnsupportedError`, ambos com mensagem que cita `--replSet`, antes de qualquer transação (FR-017); a chamada na inicialização da API é ligada na task de seleção por provider.
- `ensureIndexes()` cria os índices listados em Interfaces e é idempotente.
- `MongoDatabaseHealthProvider` responde `up` com metadata `{ provider: "mongo", database: "mongodb" }` e `down` com a mensagem de erro quando o banco não responde (FR-018).
- `isDuplicateKeyError` e `duplicateKeyFields` identificam uma violação real de índice único (código 11000) e o campo violado.
