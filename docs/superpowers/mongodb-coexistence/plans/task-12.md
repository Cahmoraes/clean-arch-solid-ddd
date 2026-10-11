# Task 12: Script ETL Postgres para Mongo [FR-013, FR-014, FR-015]

**Status:** DONE

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task entrega o script único que copia o estado atual do Postgres para o Mongo, preservando ids e todos os campos. A cópia roda em lotes de 500 por coleção, ordenados por `id`, com `bulkWrite` e `upsert` por `_id`, na ordem das dependências, e pode ser repetida ou retomada: reexecutar dá o mesmo resultado. Registros com referência sem pai e check-ins repetidos no mesmo dia (UTC) são excluídos da cópia e listados em `etl-report.json`; no fim o script valida contagem por coleção e uma amostra de 20 registros comparada campo a campo.

## Arquivos

- Create: `apps/backend/scripts/etl/etl-types.ts`
- Create: `apps/backend/scripts/etl/collection-mappers.ts`
- Create: `apps/backend/scripts/etl/prisma-etl-source.ts`
- Create: `apps/backend/scripts/etl/etl-runner.ts`
- Create: `apps/backend/scripts/etl-postgres-to-mongo.ts`
- Modify: `apps/backend/package.json`
- Modify: `.gitignore`
- Test: `apps/backend/scripts/etl/collection-mappers.test.ts`
- Test: `apps/backend/scripts/etl/etl-runner.integration-test.ts`
- Test: `apps/backend/scripts/etl/etl-postgres-to-mongo.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { constructor(url: string, dbName?: string); connect(): Promise<void>; assertTransactionsSupported(): Promise<void>; ensureIndexes(): Promise<void>; collection<T extends Document>(name: string): Collection<T>; client(): MongoClient; disconnect(): Promise<void> }` e `COLLECTIONS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
  - `type UserDocument` de `@/shared/infra/database/repository/mongo/mongo-user-repository` (task-04)
  - `class MongoGymRepository` (`fetchNearbyCoord(coordinate: Coordinate, options?: GymFetchOptions): Promise<Gym[]>`), `type GymDocument`, `toGeoPoint(latitude: number, longitude: number): GeoPoint` de `@/shared/infra/database/repository/mongo/mongo-gym-repository` (task-05)
  - `type CheckInDocument` (inclui `dayKey`) de `@/shared/infra/database/repository/mongo/mongo-check-in-repository` (task-06)
  - `type PlanDocument`, `type StripeWebhookEventDocument`, `type SubscriptionDocument` de `@/shared/infra/database/repository/mongo/mongo-plan-repository`, `.../mongo-stripe-webhook-event-repository`, `.../mongo-subscription-repository` (task-07)
  - `type NotificationDocument`, `type UserNotificationDocument` de `@/notification/infra/repository/mongo/mongo-notification.repository` (task-08)
  - `type UserActivityEventDocument` de `@/shared/infra/database/repository/mongo/mongo-user-activity-repository` (task-09)
  - `class IdRecorder { newId(): string; get ids(): readonly string[] }` de `test/repository-contract/id-recorder` (task-04)
- **Produz:**
  - `runEtl(options: EtlOptions): Promise<EtlReport>` e `class EtlBatchError extends Error { collection: EtlCollection; afterId: string | undefined }` em `scripts/etl/etl-runner`, com `interface EtlOptions { source: EtlSource; connection: MongoConnection; batchSize?: number; sampleSize?: number }`
  - `ETL_COLLECTIONS`, `type EtlCollection`, `interface EtlRows`, `interface EtlSource { readBatch<K extends EtlCollection>(collection: K, afterId: string | undefined, size: number): Promise<EtlRows[K][]>; count(collection: EtlCollection): Promise<number> }`, `interface EtlExclusion { collection: EtlCollection; id: string; reason: string }`, `interface EtlCollectionReport { sourceCount: number; copied: number; excluded: number; mongoCount: number; sampleSize: number; sampleMismatches: string[] }`, `interface EtlReport { generatedAt: string; ok: boolean; collections: Record<EtlCollection, EtlCollectionReport>; orphans: EtlExclusion[]; duplicateCheckIns: EtlExclusion[] }` em `scripts/etl/etl-types`
  - `class PrismaEtlSource implements EtlSource` (construtor `(prisma: PrismaClient)`) em `scripts/etl/prisma-etl-source`
  - Mapeadores `mapPlan`, `mapUser`, `mapGym`, `mapSubscription`, `mapCheckIn`, `mapNotification`, `mapUserNotification`, `mapUserActivityEvent`, `mapStripeWebhookEvent` em `scripts/etl/collection-mappers`
  - Script `etl:postgres-to-mongo` no `package.json` e relatório `etl-report.json`

### Skills a invocar

- `typescript-advanced`: `EtlRows` mapeia cada coleção ao tipo de linha do Prisma e `readBatch<K extends EtlCollection>` devolve `EtlRows[K][]`; os mapeadores devolvem os `*Document` das tasks anteriores, então o compilador cobra a convenção de campos.
- `no-workarounds`: nada de `as` para calar o mapeamento (um `metadata` JSON que não é objeto falha o lote em vez de ser coagido); órfãos e duplicatas são excluídos e reportados, nunca "consertados" inventando o pai.
- `test-antipatterns`: a cópia real é provada contra o Postgres e uma base Mongo descartável (nome único, removida no fim); a lógica de órfãos e duplicatas usa uma fonte em memória só porque as FKs do Postgres impedem criar esses casos, e o Mongo é sempre o real.
- `context7`: confirmar `bulkWrite` com `replaceOne` e `upsert`, `countDocuments` e o tipo `AnyBulkWriteOperation` na documentação do driver `mongodb` instalado.

## Passos

- **Step 1: Confirm the Prisma model types and fields**

Abrir `apps/backend/prisma/schema.prisma` e o client gerado em `apps/backend/src/shared/infra/database/generated/prisma/client` e confirmar que ele exporta os tipos de modelo `Plan`, `User`, `Gym`, `Subscription`, `CheckIn`, `Notification`, `UserNotification`, `UserActivityEvent` e `StripeWebhookEvent`, e os campos usados abaixo: `Plan`, `User`, `Gym`, `Subscription`, `CheckIn` e `StripeWebhookEvent` usam snake_case (`price_cents`, `created_at`, `user_id`, `event_id`...), enquanto `Notification`, `UserNotification` e `UserActivityEvent` usam camelCase no client (`userId`, `gymName`, `createdAt`, `readAt`, `occurredAt`...). `latitude`/`longitude` são `Prisma.Decimal` e `operating_hours`/`metadata` são JSON. Se algum nome divergir, ajustar os mapeadores e as fábricas de linha dos testes antes de seguir.

- **Step 2: Write the failing mapper tests**

`apps/backend/scripts/etl/collection-mappers.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { Prisma } from "@/shared/infra/database/generated/prisma/client"
import {
	mapCheckIn,
	mapGym,
	mapUserActivityEvent,
} from "./collection-mappers"

const NOW = new Date("2026-03-11T02:30:00.000Z")

describe("collection mappers", () => {
	it("INV-08: mapGym keeps the id, converts Decimal coordinates to numbers without losing digits and derives location", () => {
		const document = mapGym({
			id: "gym-1",
			cnpj: "11222333000181",
			title: "Gym",
			description: null,
			phone: null,
			address: null,
			image_key: null,
			latitude: new Prisma.Decimal("-23.550520123456"),
			longitude: new Prisma.Decimal("-46.633308"),
			status: "activated",
			operating_hours: [{ weekday: 1, intervals: [{ open: "06:00", close: "12:00" }] }],
			created_at: NOW,
			updated_at: NOW,
		})

		expect(document._id).toBe("gym-1")
		expect(document.latitude).toBe(-23.550520123456)
		expect(document.longitude).toBe(-46.633308)
		expect(typeof document.latitude).toBe("number")
		expect(document.location).toEqual({
			type: "Point",
			coordinates: [-46.633308, -23.550520123456],
		})
		expect(document.operating_hours).toEqual([
			{ weekday: 1, intervals: [{ open: "06:00", close: "12:00" }] },
		])
	})

	it("INV-08: mapGym keeps a missing operating_hours as null", () => {
		const document = mapGym({
			id: "gym-2",
			cnpj: "11222333000182",
			title: "Gym",
			description: null,
			phone: null,
			address: null,
			image_key: null,
			latitude: new Prisma.Decimal("1"),
			longitude: new Prisma.Decimal("2"),
			status: "deactivated",
			operating_hours: null,
			created_at: NOW,
			updated_at: NOW,
		})

		expect(document.operating_hours).toBeNull()
	})

	it("mapCheckIn derives dayKey as the UTC date of created_at", () => {
		const document = mapCheckIn({
			id: "check-in-1",
			created_at: NOW,
			validated_at: null,
			rejected_at: null,
			latitude: new Prisma.Decimal("-23.5505"),
			longitude: new Prisma.Decimal("-46.6333"),
			user_id: "user-1",
			gym_id: "gym-1",
			updated_at: NOW,
		})

		expect(document.dayKey).toBe("2026-03-11")
		expect(document.latitude).toBe(-23.5505)
		expect(document.validated_at).toBeNull()
	})

	it("mapUserActivityEvent keeps a JSON object and fails loudly for any other JSON value", () => {
		const base = {
			id: "event-1",
			userId: "user-1",
			type: "LOGIN",
			description: "Login",
			occurredAt: NOW,
			createdAt: NOW,
		}

		expect(mapUserActivityEvent({ ...base, metadata: { ip: "127.0.0.1" } }).metadata).toEqual({
			ip: "127.0.0.1",
		})
		expect(mapUserActivityEvent({ ...base, metadata: null }).metadata).toBeNull()
		expect(() => mapUserActivityEvent({ ...base, metadata: ["x"] })).toThrow("event-1")
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts scripts/etl/collection-mappers.test.ts`
Expected: FAIL with "Failed to resolve import "./collection-mappers""

- **Step 4: Write the types and mappers**

`apps/backend/scripts/etl/etl-types.ts`:

```ts
import type {
	CheckIn,
	Gym,
	Notification,
	Plan,
	StripeWebhookEvent,
	Subscription,
	User,
	UserActivityEvent,
	UserNotification,
} from "@/shared/infra/database/generated/prisma/client"

export const ETL_COLLECTIONS = [
	"plans",
	"users",
	"gyms",
	"subscriptions",
	"check_ins",
	"notifications",
	"user_notifications",
	"user_activity_events",
	"stripe_webhook_events",
] as const

export type EtlCollection = (typeof ETL_COLLECTIONS)[number]

export interface EtlRows {
	plans: Plan
	users: User
	gyms: Gym
	subscriptions: Subscription
	check_ins: CheckIn
	notifications: Notification
	user_notifications: UserNotification
	user_activity_events: UserActivityEvent
	stripe_webhook_events: StripeWebhookEvent
}

export interface EtlSource {
	readBatch<K extends EtlCollection>(
		collection: K,
		afterId: string | undefined,
		size: number,
	): Promise<EtlRows[K][]>
	count(collection: EtlCollection): Promise<number>
}

export interface EtlExclusion {
	collection: EtlCollection
	id: string
	reason: string
}

export interface EtlCollectionReport {
	sourceCount: number
	copied: number
	excluded: number
	mongoCount: number
	sampleSize: number
	sampleMismatches: string[]
}

export interface EtlReport {
	generatedAt: string
	ok: boolean
	collections: Record<EtlCollection, EtlCollectionReport>
	orphans: EtlExclusion[]
	duplicateCheckIns: EtlExclusion[]
}
```

`apps/backend/scripts/etl/collection-mappers.ts`:

```ts
import type {
	CheckIn,
	Gym,
	Notification,
	Plan,
	StripeWebhookEvent,
	Subscription,
	User,
	UserActivityEvent,
	UserNotification,
} from "@/shared/infra/database/generated/prisma/client"
import type { NotificationDocument, UserNotificationDocument } from "@/notification/infra/repository/mongo/mongo-notification.repository"
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import { type GymDocument, toGeoPoint } from "@/shared/infra/database/repository/mongo/mongo-gym-repository"
import type { PlanDocument } from "@/shared/infra/database/repository/mongo/mongo-plan-repository"
import type { StripeWebhookEventDocument } from "@/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository"
import type { SubscriptionDocument } from "@/shared/infra/database/repository/mongo/mongo-subscription-repository"
import type { UserActivityEventDocument } from "@/shared/infra/database/repository/mongo/mongo-user-activity-repository"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function mapPlan(row: Plan): PlanDocument {
	return {
		_id: row.id,
		name: row.name,
		price_cents: row.price_cents,
		billing_period: row.billing_period,
		tagline: row.tagline,
		features: row.features,
		is_active: row.is_active,
		stripe_price_id: row.stripe_price_id,
		created_at: row.created_at,
		updated_at: row.updated_at,
	}
}

export function mapUser(row: User): UserDocument {
	return {
		_id: row.id,
		name: row.name,
		email: row.email,
		password_hash: row.password_hash,
		google_id: row.google_id,
		created_at: row.created_at,
		role: row.role,
		updated_at: row.updated_at,
		status: row.status,
		billing_customer_id: row.billing_customer_id,
		is_super_admin: row.is_super_admin,
		deleted_at: row.deleted_at,
	}
}

export function mapGym(row: Gym): GymDocument {
	const latitude = row.latitude.toNumber()
	const longitude = row.longitude.toNumber()
	return {
		_id: row.id,
		cnpj: row.cnpj,
		title: row.title,
		description: row.description,
		phone: row.phone,
		address: row.address,
		image_key: row.image_key,
		latitude,
		longitude,
		status: row.status,
		operating_hours: row.operating_hours ?? null,
		location: toGeoPoint(latitude, longitude),
		created_at: row.created_at,
		updated_at: row.updated_at,
	}
}

export function mapSubscription(row: Subscription): SubscriptionDocument {
	return {
		_id: row.id,
		user_id: row.user_id,
		billing_subscription_id: row.billing_subscription_id,
		customer_id: row.customer_id,
		status: row.status,
		canceled_at: row.canceled_at,
		created_at: row.created_at,
		updated_at: row.updated_at,
		plan_id: row.plan_id,
		current_period_start: row.current_period_start,
		current_period_end: row.current_period_end,
		cancel_at_period_end: row.cancel_at_period_end,
	}
}

export function mapCheckIn(row: CheckIn): CheckInDocument {
	return {
		_id: row.id,
		created_at: row.created_at,
		validated_at: row.validated_at,
		rejected_at: row.rejected_at,
		latitude: row.latitude.toNumber(),
		longitude: row.longitude.toNumber(),
		user_id: row.user_id,
		gym_id: row.gym_id,
		updated_at: row.updated_at,
		dayKey: row.created_at.toISOString().slice(0, 10),
	}
}

export function mapNotification(row: Notification): NotificationDocument {
	return {
		_id: row.id,
		user_id: row.userId,
		type: row.type,
		title: row.title,
		message: row.message,
		gym_name: row.gymName,
		reason: row.reason,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	}
}

export function mapUserNotification(row: UserNotification): UserNotificationDocument {
	return {
		_id: row.id,
		notification_id: row.notificationId,
		user_id: row.userId,
		read_at: row.readAt,
		deleted_at: row.deletedAt,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	}
}

export function mapUserActivityEvent(row: UserActivityEvent): UserActivityEventDocument {
	const { metadata } = row
	if (metadata !== null && !isJsonObject(metadata)) {
		throw new Error(`user_activity_events ${row.id}: metadata is not a JSON object`)
	}
	return {
		_id: row.id,
		user_id: row.userId,
		type: row.type,
		description: row.description,
		metadata,
		occurred_at: row.occurredAt,
		created_at: row.createdAt,
	}
}

export function mapStripeWebhookEvent(row: StripeWebhookEvent): StripeWebhookEventDocument {
	return {
		_id: row.id,
		event_id: row.event_id,
		event_type: row.event_type,
		processed_at: row.processed_at,
	}
}
```

- **Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts scripts/etl/collection-mappers.test.ts`
Expected: PASS (4 testes)

- **Step 6: Review Focus: Registro do Postgres com referência sem pai (usuário, academia, plano ou notificação ausente): o ETL o reporta e o exclui, em vez de criar documento órfão — Write the failing test**

O arquivo abaixo traz esse teste (o primeiro `it`) e, no mesmo arquivo, os testes de duplicata de check-in, de lotes menores que a coleção e de retomada após falha. A fonte em memória substitui o Postgres só aqui, porque as FKs do Postgres impedem criar órfãos de verdade; o MongoDB é sempre o real.

`apps/backend/scripts/etl/etl-runner.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import { afterAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { Prisma } from "@/shared/infra/database/generated/prisma/client"
import type {
	CheckIn,
	Gym,
	Notification,
	Plan,
	StripeWebhookEvent,
	Subscription,
	User,
	UserActivityEvent,
	UserNotification,
} from "@/shared/infra/database/generated/prisma/client"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { EtlCollection, EtlRows, EtlSource } from "./etl-types"
import { EtlBatchError, runEtl } from "./etl-runner"

const NOW = new Date("2026-05-10T12:00:00.000Z")

function userRow(id: string): User {
	return {
		id,
		name: "ETL User",
		email: `${id}@etl.test`,
		password_hash: null,
		google_id: null,
		created_at: NOW,
		role: "MEMBER",
		updated_at: NOW,
		status: "activated",
		billing_customer_id: null,
		is_super_admin: false,
		deleted_at: null,
	}
}

function planRow(id: string): Plan {
	return {
		id,
		name: "ETL Plan",
		price_cents: 1000,
		billing_period: "monthly",
		tagline: "tag",
		features: [],
		is_active: true,
		stripe_price_id: null,
		created_at: NOW,
		updated_at: NOW,
	}
}

function gymRow(id: string): Gym {
	return {
		id,
		cnpj: id,
		title: "ETL Gym",
		description: null,
		phone: null,
		address: null,
		image_key: null,
		latitude: new Prisma.Decimal("-23.5505"),
		longitude: new Prisma.Decimal("-46.6333"),
		status: "activated",
		operating_hours: null,
		created_at: NOW,
		updated_at: NOW,
	}
}

function subscriptionRow(id: string, userId: string, planId: string | null): Subscription {
	return {
		id,
		user_id: userId,
		billing_subscription_id: `sub_${id}`,
		customer_id: `cus_${userId}`,
		status: "canceled",
		canceled_at: NOW,
		created_at: NOW,
		updated_at: NOW,
		plan_id: planId,
		current_period_start: NOW,
		current_period_end: NOW,
		cancel_at_period_end: false,
	}
}

function checkInRow(id: string, userId: string, gymId: string, createdAt: Date): CheckIn {
	return {
		id,
		created_at: createdAt,
		validated_at: null,
		rejected_at: null,
		latitude: new Prisma.Decimal("-23.5505"),
		longitude: new Prisma.Decimal("-46.6333"),
		user_id: userId,
		gym_id: gymId,
		updated_at: createdAt,
	}
}

function notificationRow(id: string, userId: string): Notification {
	return {
		id,
		userId,
		type: "NOTICE",
		title: "t",
		message: "m",
		gymName: null,
		reason: null,
		createdAt: NOW,
		updatedAt: NOW,
	}
}

function userNotificationRow(id: string, notificationId: string, userId: string): UserNotification {
	return {
		id,
		notificationId,
		userId,
		readAt: null,
		deletedAt: null,
		createdAt: NOW,
		updatedAt: NOW,
	}
}

function activityRow(id: string, userId: string): UserActivityEvent {
	return {
		id,
		userId,
		type: "LOGIN",
		description: "Login",
		metadata: null,
		occurredAt: NOW,
		createdAt: NOW,
	}
}

function webhookRow(id: string): StripeWebhookEvent {
	return { id, event_id: `evt_${id}`, event_type: "invoice.paid", processed_at: NOW }
}

type Rows = { [K in EtlCollection]?: EtlRows[K][] }

class ArrayEtlSource implements EtlSource {
	constructor(
		private readonly rows: Rows,
		private readonly failAfterReads?: { collection: EtlCollection; reads: number },
	) {}

	private reads = new Map<EtlCollection, number>()

	public async readBatch<K extends EtlCollection>(
		collection: K,
		afterId: string | undefined,
		size: number,
	): Promise<EtlRows[K][]> {
		const reads = (this.reads.get(collection) ?? 0) + 1
		this.reads.set(collection, reads)
		if (
			this.failAfterReads?.collection === collection &&
			reads > this.failAfterReads.reads
		) {
			throw new Error("source unavailable")
		}
		const ordered = [...(this.rows[collection] ?? [])].sort((a, b) =>
			a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
		)
		return ordered
			.filter((row) => afterId === undefined || row.id > afterId)
			.slice(0, size)
	}

	public async count(collection: EtlCollection): Promise<number> {
		return (this.rows[collection] ?? []).length
	}
}

describe("runEtl with an in-memory source", () => {
	const opened: { connection: MongoConnection; dbName: string }[] = []

	async function freshConnection(): Promise<MongoConnection> {
		const dbName = `etl_${randomUUID().replaceAll("-", "")}`
		const connection = await createTestMongoConnection(dbName)
		opened.push({ connection, dbName })
		return connection
	}

	afterAll(async () => {
		for (const { connection, dbName } of opened) {
			await connection.client().db(dbName).dropDatabase()
			await connection.disconnect()
		}
	})

	it("Review Focus: a record whose parent is missing is reported as an orphan and left out of the copy", async () => {
		const connection = await freshConnection()
		const [userId, planId, gymId, missingUser, missingPlan, missingGym, missingNotification] =
			Array.from({ length: 7 }, () => randomUUID())
		const day = (n: number) => new Date(`2026-05-${String(n).padStart(2, "0")}T12:00:00.000Z`)
		const ok = {
			subscription: randomUUID(),
			checkIn: randomUUID(),
			notification: randomUUID(),
			userNotification: randomUUID(),
			activity: randomUUID(),
			webhook: randomUUID(),
		}
		const orphan = {
			subscriptionUser: randomUUID(),
			subscriptionPlan: randomUUID(),
			checkInUser: randomUUID(),
			checkInGym: randomUUID(),
			notification: randomUUID(),
			userNotificationOfOrphanNotification: randomUUID(),
			userNotificationUser: randomUUID(),
			activity: randomUUID(),
		}
		const source = new ArrayEtlSource({
			plans: [planRow(planId)],
			users: [userRow(userId)],
			gyms: [gymRow(gymId)],
			subscriptions: [
				subscriptionRow(ok.subscription, userId, planId),
				subscriptionRow(orphan.subscriptionUser, missingUser, null),
				subscriptionRow(orphan.subscriptionPlan, userId, missingPlan),
			],
			check_ins: [
				checkInRow(ok.checkIn, userId, gymId, day(10)),
				checkInRow(orphan.checkInUser, missingUser, gymId, day(11)),
				checkInRow(orphan.checkInGym, userId, missingGym, day(12)),
			],
			notifications: [
				notificationRow(ok.notification, userId),
				notificationRow(orphan.notification, missingUser),
			],
			user_notifications: [
				userNotificationRow(ok.userNotification, ok.notification, userId),
				userNotificationRow(orphan.userNotificationOfOrphanNotification, orphan.notification, userId),
				userNotificationRow(orphan.userNotificationUser, missingNotification, userId),
			],
			user_activity_events: [
				activityRow(ok.activity, userId),
				activityRow(orphan.activity, missingUser),
			],
			stripe_webhook_events: [webhookRow(ok.webhook)],
		})

		const report = await runEtl({ source, connection })

		const count = (name: string) => connection.collection(name).countDocuments({})
		expect(await count(COLLECTIONS.PLANS)).toBe(1)
		expect(await count(COLLECTIONS.USERS)).toBe(1)
		expect(await count(COLLECTIONS.GYMS)).toBe(1)
		expect(await count(COLLECTIONS.SUBSCRIPTIONS)).toBe(1)
		expect(await count(COLLECTIONS.CHECK_INS)).toBe(1)
		expect(await count(COLLECTIONS.NOTIFICATIONS)).toBe(1)
		expect(await count(COLLECTIONS.USER_NOTIFICATIONS)).toBe(1)
		expect(await count(COLLECTIONS.USER_ACTIVITY_EVENTS)).toBe(1)
		expect(await count(COLLECTIONS.STRIPE_WEBHOOK_EVENTS)).toBe(1)
		expect(report.orphans.map((item) => `${item.collection}:${item.id}`).sort()).toEqual(
			[
				`subscriptions:${orphan.subscriptionUser}`,
				`subscriptions:${orphan.subscriptionPlan}`,
				`check_ins:${orphan.checkInUser}`,
				`check_ins:${orphan.checkInGym}`,
				`notifications:${orphan.notification}`,
				`user_notifications:${orphan.userNotificationOfOrphanNotification}`,
				`user_notifications:${orphan.userNotificationUser}`,
				`user_activity_events:${orphan.activity}`,
			].sort(),
		)
		expect(report.orphans.every((item) => item.reason.includes("missing parent"))).toBe(true)
		expect(report.collections.subscriptions).toMatchObject({ sourceCount: 3, copied: 1, excluded: 2, mongoCount: 1 })
		expect(report.ok).toBe(true)
	})

	it("FR-015: a second check-in of the same user on the same UTC day is reported and excluded, keeping the first by id", async () => {
		const connection = await freshConnection()
		const userId = randomUUID()
		const gymId = randomUUID()
		const [firstId, secondId] = [randomUUID(), randomUUID()].sort()
		const source = new ArrayEtlSource({
			users: [userRow(userId)],
			gyms: [gymRow(gymId)],
			check_ins: [
				checkInRow(firstId, userId, gymId, new Date("2026-05-10T01:00:00.000Z")),
				checkInRow(secondId, userId, gymId, new Date("2026-05-10T23:00:00.000Z")),
			],
		})

		const report = await runEtl({ source, connection })

		const stored = await connection.collection(COLLECTIONS.CHECK_INS).find({}).toArray()
		expect(stored.map((document) => document._id)).toEqual([firstId])
		expect(report.duplicateCheckIns).toEqual([
			expect.objectContaining({ collection: "check_ins", id: secondId }),
		])
		expect(report.collections.check_ins).toMatchObject({ sourceCount: 2, copied: 1, excluded: 1, mongoCount: 1 })
		expect(report.ok).toBe(true)
	})

	it("copies a collection larger than the batch size in id order", async () => {
		const connection = await freshConnection()
		const plans = Array.from({ length: 5 }, () => planRow(randomUUID()))
		const source = new ArrayEtlSource({ plans })

		const report = await runEtl({ source, connection, batchSize: 2 })

		expect(report.collections.plans).toMatchObject({ sourceCount: 5, copied: 5, mongoCount: 5 })
		expect(await connection.collection(COLLECTIONS.PLANS).countDocuments({})).toBe(5)
	})

	it("FR-014: a failure in the middle names the collection and running again completes the copy", async () => {
		const connection = await freshConnection()
		const users = Array.from({ length: 5 }, () => userRow(randomUUID()))
		const failing = new ArrayEtlSource({ users }, { collection: "users", reads: 1 })

		const error = await runEtl({ source: failing, connection, batchSize: 2 }).then(
			() => undefined,
			(caught: unknown) => caught,
		)

		expect(error).toBeInstanceOf(EtlBatchError)
		if (!(error instanceof EtlBatchError)) return
		expect(error.collection).toBe("users")
		expect(await connection.collection(COLLECTIONS.USERS).countDocuments({})).toBe(2)

		const report = await runEtl({ source: new ArrayEtlSource({ users }), connection, batchSize: 2 })

		expect(report.collections.users).toMatchObject({ sourceCount: 5, copied: 5, mongoCount: 5 })
		expect(await connection.collection(COLLECTIONS.USERS).countDocuments({})).toBe(5)
	})
})
```

- **Step 7: Review Focus: Reexecutar o ETL com `deleted_at`, coordenadas decimais e `operating_hours` JSON: o resultado é idêntico e nenhum campo perde precisão ou muda de tipo — Write the failing test**

`apps/backend/scripts/etl/etl-postgres-to-mongo.integration-test.ts` (Postgres real; base Mongo descartável):

```ts
import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { isDeepStrictEqual } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { MongoGymRepository } from "@/shared/infra/database/repository/mongo/mongo-gym-repository"
import type { EtlCollection, EtlReport } from "./etl-types"
import { ETL_COLLECTIONS } from "./etl-types"
import { PrismaEtlSource } from "./prisma-etl-source"
import { runEtl } from "./etl-runner"

const MONGO_COLLECTION: Record<EtlCollection, string> = {
	plans: COLLECTIONS.PLANS,
	users: COLLECTIONS.USERS,
	gyms: COLLECTIONS.GYMS,
	subscriptions: COLLECTIONS.SUBSCRIPTIONS,
	check_ins: COLLECTIONS.CHECK_INS,
	notifications: COLLECTIONS.NOTIFICATIONS,
	user_notifications: COLLECTIONS.USER_NOTIFICATIONS,
	user_activity_events: COLLECTIONS.USER_ACTIVITY_EVENTS,
	stripe_webhook_events: COLLECTIONS.STRIPE_WEBHOOK_EVENTS,
}

async function dump(connection: MongoConnection): Promise<Record<string, Document[]>> {
	const result: Record<string, Document[]> = {}
	for (const collection of ETL_COLLECTIONS) {
		result[collection] = await connection
			.collection<Document>(MONGO_COLLECTION[collection])
			.find({})
			.sort({ _id: 1 })
			.toArray()
	}
	return result
}

describe("ETL from the real Postgres into a throwaway MongoDB", () => {
	const dbName = `etl_${randomUUID().replaceAll("-", "")}`
	const recorder = new IdRecorder()
	const userId = recorder.newId()
	const deletedUserId = recorder.newId()
	const gymId = recorder.newId()
	const checkInId = recorder.newId()
	const operatingHours = [
		{ weekday: 1, intervals: [{ open: "06:00", close: "12:00" }] },
		{ weekday: 2, intervals: [] },
	]
	const deletedAt = new Date("2026-04-01T10:20:30.456Z")
	const checkInAt = new Date("2026-03-11T02:30:00.000Z")
	let connection: MongoConnection
	let firstReport: EtlReport
	let secondReport: EtlReport
	let firstDump: Record<string, Document[]>
	let secondDump: Record<string, Document[]>

	beforeAll(async () => {
		await prismaClient.user.createMany({
			data: [
				{
					id: userId,
					name: "ETL Real User",
					email: `${userId}@etl-real.test`,
					role: "MEMBER",
					status: "activated",
				},
				{
					id: deletedUserId,
					name: "ETL Deleted User",
					email: `${deletedUserId}@etl-real.test`,
					role: "MEMBER",
					status: "suspended",
					deleted_at: deletedAt,
				},
			],
		})
		await prismaClient.gym.create({
			data: {
				id: gymId,
				cnpj: Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join(""),
				title: "ETL Real Gym",
				latitude: "-12.345678123456",
				longitude: "-23.456789",
				status: "activated",
				operating_hours: operatingHours,
			},
		})
		await prismaClient.checkIn.create({
			data: {
				id: checkInId,
				user_id: userId,
				gym_id: gymId,
				created_at: checkInAt,
				latitude: "-12.345678123456",
				longitude: "-23.456789",
			},
		})
		connection = await createTestMongoConnection(dbName)
		const source = new PrismaEtlSource(prismaClient)
		firstReport = await runEtl({ source, connection })
		firstDump = await dump(connection)
		secondReport = await runEtl({ source, connection })
		secondDump = await dump(connection)
	}, 180_000)

	afterAll(async () => {
		await prismaClient.checkIn.deleteMany({ where: { id: checkInId } })
		await prismaClient.gym.deleteMany({ where: { id: gymId } })
		await prismaClient.user.deleteMany({ where: { id: { in: [userId, deletedUserId] } } })
		await prismaClient.$disconnect()
		await connection.client().db(dbName).dropDatabase()
		await connection.disconnect()
	})

	it("Review Focus: running the ETL again leaves every collection identical", () => {
		expect(secondDump).toEqual(firstDump)
		expect(isDeepStrictEqual(secondReport.collections, firstReport.collections)).toBe(true)
	})

	it("Review Focus: deleted_at, decimal coordinates and operating_hours keep their value and type", async () => {
		const users = connection.collection<Document>(COLLECTIONS.USERS)
		const gyms = connection.collection<Document>(COLLECTIONS.GYMS)

		const deletedUser = await users.findOne({ _id: deletedUserId })
		const gym = await gyms.findOne({ _id: gymId })

		expect(deletedUser?.deleted_at).toBeInstanceOf(Date)
		expect(deletedUser?.deleted_at).toEqual(deletedAt)
		expect((await users.findOne({ _id: userId }))?.deleted_at).toBeNull()
		expect(typeof gym?.latitude).toBe("number")
		expect(gym?.latitude).toBe(-12.345678123456)
		expect(gym?.longitude).toBe(-23.456789)
		expect(gym?.operating_hours).toEqual(operatingHours)
	})

	it("AC-06: counts match the Postgres tables on both runs, with the exclusions reported", async () => {
		const tableCounts: Record<EtlCollection, () => Promise<number>> = {
			plans: () => prismaClient.plan.count(),
			users: () => prismaClient.user.count(),
			gyms: () => prismaClient.gym.count(),
			subscriptions: () => prismaClient.subscription.count(),
			check_ins: () => prismaClient.checkIn.count(),
			notifications: () => prismaClient.notification.count(),
			user_notifications: () => prismaClient.userNotification.count(),
			user_activity_events: () => prismaClient.userActivityEvent.count(),
			stripe_webhook_events: () => prismaClient.stripeWebhookEvent.count(),
		}
		for (const report of [firstReport, secondReport]) {
			for (const collection of ETL_COLLECTIONS) {
				const entry = report.collections[collection]
				expect(entry.excluded + entry.mongoCount).toBe(await tableCounts[collection]())
				expect(entry.sampleMismatches).toEqual([])
			}
			expect(report.ok).toBe(true)
		}
	})

	it("INV-08: the copied user, gym and check-in keep the id and every field", async () => {
		const user = await prismaClient.user.findUniqueOrThrow({ where: { id: deletedUserId } })
		const gym = await prismaClient.gym.findUniqueOrThrow({ where: { id: gymId } })
		const checkIn = await prismaClient.checkIn.findUniqueOrThrow({ where: { id: checkInId } })

		const userDocument = await connection
			.collection<Document>(COLLECTIONS.USERS)
			.findOne({ _id: deletedUserId })
		const gymDocument = await connection
			.collection<Document>(COLLECTIONS.GYMS)
			.findOne({ _id: gymId })
		const checkInDocument = await connection
			.collection<Document>(COLLECTIONS.CHECK_INS)
			.findOne({ _id: checkInId })

		expect(userDocument).toEqual({
			_id: user.id,
			name: user.name,
			email: user.email,
			password_hash: user.password_hash,
			google_id: user.google_id,
			created_at: user.created_at,
			role: user.role,
			updated_at: user.updated_at,
			status: user.status,
			billing_customer_id: user.billing_customer_id,
			is_super_admin: user.is_super_admin,
			deleted_at: user.deleted_at,
		})
		expect(gymDocument).toEqual({
			_id: gym.id,
			cnpj: gym.cnpj,
			title: gym.title,
			description: gym.description,
			phone: gym.phone,
			address: gym.address,
			image_key: gym.image_key,
			latitude: gym.latitude.toNumber(),
			longitude: gym.longitude.toNumber(),
			status: gym.status,
			operating_hours: gym.operating_hours,
			location: { type: "Point", coordinates: [gym.longitude.toNumber(), gym.latitude.toNumber()] },
			created_at: gym.created_at,
			updated_at: gym.updated_at,
		})
		expect(checkInDocument).toEqual({
			_id: checkIn.id,
			created_at: checkIn.created_at,
			validated_at: checkIn.validated_at,
			rejected_at: checkIn.rejected_at,
			latitude: checkIn.latitude.toNumber(),
			longitude: checkIn.longitude.toNumber(),
			user_id: checkIn.user_id,
			gym_id: checkIn.gym_id,
			updated_at: checkIn.updated_at,
			dayKey: "2026-03-11",
		})
	})

	it("a copied gym is found by the Mongo 10 km search because its location was written", async () => {
		const nearby = await new MongoGymRepository(connection).fetchNearbyCoord(
			Coordinate.restore({ latitude: -12.345678, longitude: -23.456789 }),
		)

		expect(nearby.map((gym) => gym.id)).toContain(gymId)
	})
})
```

- **Step 8: Run the tests to verify they fail**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts scripts/etl/etl-runner.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./etl-runner""

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts scripts/etl/etl-postgres-to-mongo.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./prisma-etl-source""

- **Step 9: Write the source and the runner**

`apps/backend/scripts/etl/prisma-etl-source.ts`:

```ts
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import type { EtlCollection, EtlRows, EtlSource } from "./etl-types"

type Readers = {
	[K in EtlCollection]: (afterId: string | undefined, size: number) => Promise<EtlRows[K][]>
}

function after(afterId: string | undefined): { id?: { gt: string } } {
	return afterId === undefined ? {} : { id: { gt: afterId } }
}

export class PrismaEtlSource implements EtlSource {
	private readonly readers: Readers

	constructor(private readonly prisma: PrismaClient) {
		this.readers = {
			plans: (afterId, size) =>
				prisma.plan.findMany({ where: after(afterId), orderBy: { id: "asc" }, take: size }),
			users: (afterId, size) =>
				prisma.user.findMany({ where: after(afterId), orderBy: { id: "asc" }, take: size }),
			gyms: (afterId, size) =>
				prisma.gym.findMany({ where: after(afterId), orderBy: { id: "asc" }, take: size }),
			subscriptions: (afterId, size) =>
				prisma.subscription.findMany({ where: after(afterId), orderBy: { id: "asc" }, take: size }),
			check_ins: (afterId, size) =>
				prisma.checkIn.findMany({ where: after(afterId), orderBy: { id: "asc" }, take: size }),
			notifications: (afterId, size) =>
				prisma.notification.findMany({ where: after(afterId), orderBy: { id: "asc" }, take: size }),
			user_notifications: (afterId, size) =>
				prisma.userNotification.findMany({ where: after(afterId), orderBy: { id: "asc" }, take: size }),
			user_activity_events: (afterId, size) =>
				prisma.userActivityEvent.findMany({ where: after(afterId), orderBy: { id: "asc" }, take: size }),
			stripe_webhook_events: (afterId, size) =>
				prisma.stripeWebhookEvent.findMany({ where: after(afterId), orderBy: { id: "asc" }, take: size }),
		}
	}

	public readBatch<K extends EtlCollection>(
		collection: K,
		afterId: string | undefined,
		size: number,
	): Promise<EtlRows[K][]> {
		return this.readers[collection](afterId, size)
	}

	public async count(collection: EtlCollection): Promise<number> {
		const counts: Record<EtlCollection, () => Promise<number>> = {
			plans: () => this.prisma.plan.count(),
			users: () => this.prisma.user.count(),
			gyms: () => this.prisma.gym.count(),
			subscriptions: () => this.prisma.subscription.count(),
			check_ins: () => this.prisma.checkIn.count(),
			notifications: () => this.prisma.notification.count(),
			user_notifications: () => this.prisma.userNotification.count(),
			user_activity_events: () => this.prisma.userActivityEvent.count(),
			stripe_webhook_events: () => this.prisma.stripeWebhookEvent.count(),
		}
		return counts[collection]()
	}
}
```

`apps/backend/scripts/etl/etl-runner.ts`:

```ts
import { isDeepStrictEqual } from "node:util"
import type { AnyBulkWriteOperation, Document } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	mapCheckIn,
	mapGym,
	mapNotification,
	mapPlan,
	mapStripeWebhookEvent,
	mapSubscription,
	mapUser,
	mapUserActivityEvent,
	mapUserNotification,
} from "./collection-mappers"
import type {
	EtlCollection,
	EtlCollectionReport,
	EtlExclusion,
	EtlReport,
	EtlRows,
	EtlSource,
} from "./etl-types"

const DEFAULT_BATCH_SIZE = 500
const DEFAULT_SAMPLE_SIZE = 20

export interface EtlOptions {
	source: EtlSource
	connection: MongoConnection
	batchSize?: number
	sampleSize?: number
}

export class EtlBatchError extends Error {
	constructor(
		readonly collection: EtlCollection,
		readonly afterId: string | undefined,
		options: ErrorOptions,
	) {
		super(
			`ETL failed on ${collection} in the batch after id ${afterId ?? "(start)"}; run it again to resume`,
			options,
		)
		this.name = "EtlBatchError"
	}
}

interface ParentSets {
	plans: Set<string>
	users: Set<string>
	gyms: Set<string>
	notifications: Set<string>
}

interface EtlContext {
	parents: ParentSets
	checkInDays: Map<string, string>
}

interface Exclusion {
	kind: "orphan" | "duplicate-check-in"
	reason: string
}

interface CollectionSpec<K extends EtlCollection> {
	name: K
	mongoName: string
	parentSet?: keyof ParentSets
	map(row: EtlRows[K]): Document
	// Decides whether a row is left out of the copy. It also records what later rows depend on.
	decide(row: EtlRows[K], context: EtlContext): Exclusion | undefined
}

function missingParent(
	parents: Set<string>,
	parentName: string,
	id: string,
): Exclusion | undefined {
	return parents.has(id)
		? undefined
		: { kind: "orphan", reason: `missing parent ${parentName}/${id}` }
}

const planSpec: CollectionSpec<"plans"> = {
	name: "plans",
	mongoName: COLLECTIONS.PLANS,
	parentSet: "plans",
	map: mapPlan,
	decide: () => undefined,
}

const userSpec: CollectionSpec<"users"> = {
	name: "users",
	mongoName: COLLECTIONS.USERS,
	parentSet: "users",
	map: mapUser,
	decide: () => undefined,
}

const gymSpec: CollectionSpec<"gyms"> = {
	name: "gyms",
	mongoName: COLLECTIONS.GYMS,
	parentSet: "gyms",
	map: mapGym,
	decide: () => undefined,
}

const subscriptionSpec: CollectionSpec<"subscriptions"> = {
	name: "subscriptions",
	mongoName: COLLECTIONS.SUBSCRIPTIONS,
	map: mapSubscription,
	decide: (row, { parents }) =>
		missingParent(parents.users, "users", row.user_id) ??
		(row.plan_id ? missingParent(parents.plans, "plans", row.plan_id) : undefined),
}

const checkInSpec: CollectionSpec<"check_ins"> = {
	name: "check_ins",
	mongoName: COLLECTIONS.CHECK_INS,
	map: mapCheckIn,
	decide: (row, context) => {
		const orphan =
			missingParent(context.parents.users, "users", row.user_id) ??
			missingParent(context.parents.gyms, "gyms", row.gym_id)
		if (orphan) return orphan
		const dayKey = `${row.user_id}|${row.created_at.toISOString().slice(0, 10)}`
		const keptId = context.checkInDays.get(dayKey)
		if (keptId !== undefined) {
			return {
				kind: "duplicate-check-in",
				reason: `same user and UTC day as check-in ${keptId}`,
			}
		}
		context.checkInDays.set(dayKey, row.id)
		return undefined
	},
}

const notificationSpec: CollectionSpec<"notifications"> = {
	name: "notifications",
	mongoName: COLLECTIONS.NOTIFICATIONS,
	parentSet: "notifications",
	map: mapNotification,
	decide: (row, { parents }) => missingParent(parents.users, "users", row.userId),
}

const userNotificationSpec: CollectionSpec<"user_notifications"> = {
	name: "user_notifications",
	mongoName: COLLECTIONS.USER_NOTIFICATIONS,
	map: mapUserNotification,
	decide: (row, { parents }) =>
		missingParent(parents.notifications, "notifications", row.notificationId) ??
		missingParent(parents.users, "users", row.userId),
}

const activityEventSpec: CollectionSpec<"user_activity_events"> = {
	name: "user_activity_events",
	mongoName: COLLECTIONS.USER_ACTIVITY_EVENTS,
	map: mapUserActivityEvent,
	decide: (row, { parents }) => missingParent(parents.users, "users", row.userId),
}

const webhookEventSpec: CollectionSpec<"stripe_webhook_events"> = {
	name: "stripe_webhook_events",
	mongoName: COLLECTIONS.STRIPE_WEBHOOK_EVENTS,
	map: mapStripeWebhookEvent,
	decide: () => undefined,
}

interface CopyDependencies {
	options: EtlOptions
	batchSize: number
	sampleSize: number
	context: EtlContext
	orphans: EtlExclusion[]
	duplicateCheckIns: EtlExclusion[]
}

async function copyCollection<K extends EtlCollection>(
	spec: CollectionSpec<K>,
	dependencies: CopyDependencies,
): Promise<EtlCollectionReport> {
	const { options, batchSize, sampleSize, context } = dependencies
	const target = options.connection.collection<Document>(spec.mongoName)
	const sample: Document[] = []
	let afterId: string | undefined
	let copied = 0
	let excluded = 0

	for (;;) {
		try {
			const rows = await options.source.readBatch(spec.name, afterId, batchSize)
			if (rows.length === 0) break
			const operations: AnyBulkWriteOperation<Document>[] = []
			for (const row of rows) {
				const exclusion = spec.decide(row, context)
				if (exclusion) {
					excluded += 1
					const entry: EtlExclusion = {
						collection: spec.name,
						id: row.id,
						reason: exclusion.reason,
					}
					if (exclusion.kind === "orphan") dependencies.orphans.push(entry)
					else dependencies.duplicateCheckIns.push(entry)
					continue
				}
				const document = spec.map(row)
				operations.push({
					replaceOne: { filter: { _id: row.id }, replacement: document, upsert: true },
				})
				if (spec.parentSet) context.parents[spec.parentSet].add(row.id)
				if (sample.length < sampleSize) sample.push(document)
				copied += 1
			}
			if (operations.length > 0) await target.bulkWrite(operations)
			afterId = rows[rows.length - 1].id
		} catch (error) {
			throw new EtlBatchError(spec.name, afterId, { cause: error })
		}
	}

	const sourceCount = await options.source.count(spec.name)
	const mongoCount = await target.countDocuments({})
	const stored = await target
		.find({ _id: { $in: sample.map((document) => document._id) } })
		.toArray()
	const storedById = new Map(stored.map((document) => [document._id, document]))
	const sampleMismatches = sample
		.filter((document) => !isDeepStrictEqual(storedById.get(document._id), document))
		.map((document) => String(document._id))

	return {
		sourceCount,
		copied,
		excluded,
		mongoCount,
		sampleSize: sample.length,
		sampleMismatches,
	}
}

function isConsistent(report: EtlCollectionReport): boolean {
	return (
		report.mongoCount === report.sourceCount - report.excluded &&
		report.sampleMismatches.length === 0
	)
}

export async function runEtl(options: EtlOptions): Promise<EtlReport> {
	const dependencies: CopyDependencies = {
		options,
		batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
		sampleSize: options.sampleSize ?? DEFAULT_SAMPLE_SIZE,
		context: {
			parents: {
				plans: new Set(),
				users: new Set(),
				gyms: new Set(),
				notifications: new Set(),
			},
			checkInDays: new Map(),
		},
		orphans: [],
		duplicateCheckIns: [],
	}

	// One batch operation at a time, in dependency order, without a global transaction.
	const plans = await copyCollection(planSpec, dependencies)
	const users = await copyCollection(userSpec, dependencies)
	const gyms = await copyCollection(gymSpec, dependencies)
	const subscriptions = await copyCollection(subscriptionSpec, dependencies)
	const check_ins = await copyCollection(checkInSpec, dependencies)
	const notifications = await copyCollection(notificationSpec, dependencies)
	const user_notifications = await copyCollection(userNotificationSpec, dependencies)
	const user_activity_events = await copyCollection(activityEventSpec, dependencies)
	const stripe_webhook_events = await copyCollection(webhookEventSpec, dependencies)

	const collections = {
		plans,
		users,
		gyms,
		subscriptions,
		check_ins,
		notifications,
		user_notifications,
		user_activity_events,
		stripe_webhook_events,
	}
	return {
		generatedAt: new Date().toISOString(),
		ok: Object.values(collections).every(isConsistent),
		collections,
		orphans: dependencies.orphans,
		duplicateCheckIns: dependencies.duplicateCheckIns,
	}
}
```

`apps/backend/scripts/etl-postgres-to-mongo.ts`:

```ts
import { writeFile } from "node:fs/promises"
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { env } from "@/shared/infra/env"
import { runEtl } from "./etl/etl-runner"
import { PrismaEtlSource } from "./etl/prisma-etl-source"

const REPORT_PATH = "etl-report.json"

async function main(): Promise<void> {
	if (!env.DATABASE_URL_MONGO) {
		throw new Error("DATABASE_URL_MONGO is required to run the ETL")
	}
	const connection = new MongoConnection(env.DATABASE_URL_MONGO)
	try {
		await connection.connect()
		await connection.assertTransactionsSupported()
		await connection.ensureIndexes()
		const report = await runEtl({
			source: new PrismaEtlSource(prismaClient),
			connection,
		})
		await writeFile(REPORT_PATH, JSON.stringify(report, null, 2))
		console.log(
			`ETL finished (${report.ok ? "ok" : "inconsistent"}); excluded: ${report.orphans.length} orphans, ${report.duplicateCheckIns.length} duplicate check-ins; report: ${REPORT_PATH}`,
		)
		if (!report.ok) process.exitCode = 1
	} finally {
		await connection.disconnect()
		await prismaClient.$disconnect()
	}
}

await main()
```

Em `apps/backend/package.json`, acrescentar ao lado de `prisma:seed`:

```json
"etl:postgres-to-mongo": "npx tsx scripts/etl-postgres-to-mongo.ts",
```

Em `.gitignore` (raiz do repositório), acrescentar a linha `apps/backend/etl-report.json`.

- **Step 10: Run the tests to verify they pass**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts scripts/etl/etl-runner.integration-test.ts`
Expected: PASS (4 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts scripts/etl/etl-postgres-to-mongo.integration-test.ts`
Expected: PASS (5 testes; exige Postgres e o MongoDB do compose; copia o Postgres de desenvolvimento para uma base Mongo descartável)

- **Step 11: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/scripts apps/backend/package.json .gitignore
git commit -m "feat(backend): ETL idempotente de Postgres para Mongo com relatório de exclusões"
```

## Critérios de Sucesso

- AC-06 [int]: WHEN o ETL roda duas vezes THEN o resultado é idêntico e as contagens batem
- INV-08 [int]: Copiar um registro do Postgres para o Mongo preserva todos os campos e o id
- INV-05 [unverified]: Excluir `Notification` remove suas `UserNotification` (antigo Cascade) · motivo: nenhuma porta de repositório expõe exclusão física de `Notification`, então não há caminho de código a testar; o ETL só preserva a regra ao excluir `UserNotification` órfã. · conferência: `grep -rniE "delete|remove" apps/backend/src --include="*repository*.ts" -l | grep -i application` (sem resultado, nenhuma porta de aplicação expõe exclusão física)
- INV-06 [unverified]: Não se exclui `User` ou `Plan` com `Subscription` ou `Notification` associadas (antigo Restrict) · motivo: nenhuma porta de repositório expõe exclusão física de `User` nem de `Plan`, então não há caminho de código a testar; o ETL só preserva a regra ao excluir `Subscription` e `Notification` sem pai. · conferência: `grep -rniE "delete|remove" apps/backend/src --include="*repository*.ts" -l | grep -i application` (sem resultado, nenhuma porta de aplicação expõe exclusão física)
- AC-07 [unverified]: WHEN se exclui uma `Notification` THEN suas `UserNotification` somem; WHEN se exclui um `User` com assinatura THEN a exclusão é recusada · motivo: nenhuma porta de repositório expõe exclusão física de `Notification` ou `User`, então não há caminho de código a testar. · conferência: `grep -rniE "delete|remove" apps/backend/src --include="*repository*.ts" -l | grep -i application` (sem resultado) e, para o efeito do ETL, `jq '.orphans' apps/backend/etl-report.json`
- Risco: Integridade referencial só na aplicação
- Risco: Dados legados que violam unicidade
- **Mecanismo:** lotes de 500 por coleção, ordenados por `id`, `bulkWrite` com `upsert` por `_id`; ordem respeita as dependências (`Plan`, `User`, `Gym`, `Subscription`, `CheckIn`, `Notification`, `UserNotification`, `UserActivityEvent`, `StripeWebhookEvent`). Uma operação em lote por vez, sem transação global.
- **Critério de fim:** para cada coleção, `count(*)` da tabela = `countDocuments` da coleção, e a amostra de 20 registros por coleção é igual campo a campo.
- Com exclusões (órfãos e check-ins repetidos no mesmo dia), o relatório confere `count(*)` = `countDocuments` + registros excluídos e lista cada exclusão.
- FR-013, FR-014, FR-015: o script preserva ids e campos, é repetível e retomável (um lote que falha dá `EtlBatchError` com a coleção e reexecutar completa a cópia), valida contagem e amostra e exclui e reporta órfãos e check-ins repetidos no mesmo dia (UTC).
