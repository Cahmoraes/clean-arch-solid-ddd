# Task 10: Repositórios de analytics no Mongo com aggregation pipeline [FR-011]

**Status:** DONE

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task entrega `MongoAnalyticsCheckInRepository` e `MongoAnalyticsUserRepository`, que reproduzem com aggregation pipeline os SQLs do Prisma: total, série diária e distribuição por hora de check-ins, e retenção e crescimento de usuários. As datas são agrupadas em UTC, como o `DATE_TRUNC` do Postgres, com semana começando na segunda-feira. Um teste de paridade carrega os mesmos dados no Postgres e no Mongo e compara a saída dos dois adaptadores.

## Arquivos

- Create: `apps/backend/src/shared/infra/database/repository/mongo/mongo-analytics-check-in-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/mongo/mongo-analytics-user-repository.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/mongo-analytics.parity.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { collection<T extends Document>(name: string): Collection<T>; client(): MongoClient }`, `COLLECTIONS.USERS`, `COLLECTIONS.CHECK_INS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02; o `dbName` permite uma base Mongo descartável)
  - `SHARED_TYPES.Mongo.Connection` de `@/shared/infra/ioc/types` (task-02)
  - `type UserDocument` (campos `_id`, `name`, `email`, `created_at`, entre outros) de `@/shared/infra/database/repository/mongo/mongo-user-repository` (task-04)
  - `type CheckInDocument` (campos `_id`, `user_id`, `gym_id`, `created_at`, `dayKey`, entre outros) de `@/shared/infra/database/repository/mongo/mongo-check-in-repository` (task-06)
  - `class PrismaReferenceSeeder { ensureGyms(ids: readonly string[]): Promise<void>; cleanup(): Promise<void> }` de `test/repository-contract/prisma-reference-seeder` (task-06)
  - `class IdRecorder { newId(): string; get ids(): readonly string[] }` de `test/repository-contract/id-recorder` (task-04)
- **Produz:**
  - `class MongoAnalyticsCheckInRepository implements AnalyticsCheckInRepository` (`@injectable()`, construtor `(connection: MongoConnection)`, `fetchCheckInAnalytics(period: AnalyticsPeriod): Promise<CheckInAnalytics>`) em `@/shared/infra/database/repository/mongo/mongo-analytics-check-in-repository`
  - `class MongoAnalyticsUserRepository implements AnalyticsUserRepository` (`@injectable()`, construtor `(connection: MongoConnection)`, `fetchRetentionAnalytics(period: AnalyticsPeriod): Promise<RetentionAnalytics>`, `fetchGrowthAnalytics(period: AnalyticsPeriod): Promise<GrowthAnalytics>`) em `@/shared/infra/database/repository/mongo/mongo-analytics-user-repository`

### Skills a invocar

- `typescript-advanced`: cada `aggregate<T>()` recebe o tipo da linha agregada (`{ _id: string; count: number }`), sem `any`, e o mapeamento para `DailyCount`, `HourlyCount` e `PeriodCount` é tipado.
- `no-workarounds`: as janelas de 30 e 14 dias, o `LIMIT 50` e o total de usuários sem filtro de `deleted_at` repetem o SQL do Prisma mesmo onde parecem estranhos; o dia/semana é truncado em UTC no banco, não em JavaScript.
- `test-antipatterns`: a paridade compara as saídas reais dos dois adaptadores sobre os mesmos dados (espelhados numa base Mongo descartável), e confere valores esperados concretos para que dois resultados vazios não passem por iguais.
- `context7`: confirmar na documentação do MongoDB `$dateTrunc` (`unit`, `timezone`, `startOfWeek`), `$dateToString`, `$hour` com `timezone`, `$count` e `$lookup`, disponíveis a partir do MongoDB 5.0.

## Passos

- **Step 1: Write the failing test**

`apps/backend/src/shared/infra/database/repository/mongo/mongo-analytics.parity.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import type { Collection, Document } from "mongodb"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaAnalyticsCheckInRepository } from "@/shared/infra/database/repository/prisma/prisma-analytics-check-in-repository"
import { PrismaAnalyticsUserRepository } from "@/shared/infra/database/repository/prisma/prisma-analytics-user-repository"
import { MongoAnalyticsCheckInRepository } from "./mongo-analytics-check-in-repository"
import { MongoAnalyticsUserRepository } from "./mongo-analytics-user-repository"

const CHUNK_SIZE = 500
const DAY_MS = 24 * 3_600_000

// Half a day past a whole number of days, so the integer "days since" never sits on a boundary.
function daysAgo(days: number): Date {
	return new Date(Date.now() - days * DAY_MS - DAY_MS / 2)
}

function periodOf(key: string): AnalyticsPeriod {
	const result = AnalyticsPeriod.fromKey(key)
	if (result.isFailure()) throw result.value
	return result.value
}

async function insertInChunks(
	collection: Collection<Document>,
	documents: Document[],
): Promise<void> {
	for (let start = 0; start < documents.length; start += CHUNK_SIZE) {
		await collection.insertMany(documents.slice(start, start + CHUNK_SIZE))
	}
}

describe("analytics parity (Prisma x Mongo)", () => {
	let connection: MongoConnection
	const dbName = `analytics_parity_${randomUUID().replaceAll("-", "")}`
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)

	const activeRecent = { id: "", name: "Parity Active Recent", createdDaysAgo: 2 }
	const activeBoundary = { id: "", name: "Parity Active Boundary", createdDaysAgo: 10 }
	const inactiveOld = { id: "", name: "Parity Inactive Old", createdDaysAgo: 450 }
	const inactiveOlder = { id: "", name: "Parity Inactive Older", createdDaysAgo: 460 }
	const noCheckIn = { id: "", name: "Parity No Check-in", createdDaysAgo: 1 }
	const syntheticUsers = [activeRecent, activeBoundary, inactiveOld, inactiveOlder, noCheckIn]
	const syntheticCheckIns: { userIndex: number; daysAgo: number }[] = [
		{ userIndex: 0, daysAgo: 3 },
		{ userIndex: 0, daysAgo: 5 },
		{ userIndex: 1, daysAgo: 20 },
		{ userIndex: 2, daysAgo: 400 },
		{ userIndex: 3, daysAgo: 401 },
	]

	let prismaCheckIns: PrismaAnalyticsCheckInRepository
	let prismaUsers: PrismaAnalyticsUserRepository
	let mongoCheckIns: MongoAnalyticsCheckInRepository
	let mongoUsers: MongoAnalyticsUserRepository

	beforeAll(async () => {
		connection = await createTestMongoConnection(dbName)
		const mongoUsersCollection = connection.collection<Document>(COLLECTIONS.USERS)
		const mongoCheckInsCollection = connection.collection<Document>(COLLECTIONS.CHECK_INS)

		// 1. Mirror what Postgres already holds into the throwaway Mongo database.
		const existingUsers = await prismaClient.user.findMany({
			select: { id: true, name: true, email: true, created_at: true },
		})
		await insertInChunks(
			mongoUsersCollection,
			existingUsers.map((user) => ({
				_id: user.id,
				name: user.name,
				email: user.email,
				created_at: user.created_at,
			})),
		)
		const existingCheckIns = await prismaClient.checkIn.findMany({
			select: { id: true, user_id: true, gym_id: true, created_at: true },
		})
		await insertInChunks(
			mongoCheckInsCollection,
			existingCheckIns.map((checkIn) => ({
				_id: checkIn.id,
				user_id: checkIn.user_id,
				gym_id: checkIn.gym_id,
				created_at: checkIn.created_at,
				// Analytics never read dayKey; the id keeps legacy same-day rows from tripping the unique index.
				dayKey: checkIn.id,
			})),
		)

		// 2. Add the same synthetic rows to both databases.
		const gymId = recorder.newId()
		await seeder.ensureGyms([gymId])
		for (const user of syntheticUsers) user.id = recorder.newId()
		await prismaClient.user.createMany({
			data: syntheticUsers.map((user) => ({
				id: user.id,
				name: user.name,
				email: `${user.id}@parity.test`,
				role: "MEMBER" as const,
				status: "activated" as const,
				created_at: daysAgo(user.createdDaysAgo),
			})),
		})
		await insertInChunks(
			mongoUsersCollection,
			syntheticUsers.map((user) => ({
				_id: user.id,
				name: user.name,
				email: `${user.id}@parity.test`,
				created_at: daysAgo(user.createdDaysAgo),
			})),
		)
		const checkInRows = syntheticCheckIns.map((checkIn) => ({
			id: recorder.newId(),
			userId: syntheticUsers[checkIn.userIndex].id,
			createdAt: daysAgo(checkIn.daysAgo),
		}))
		await prismaClient.checkIn.createMany({
			data: checkInRows.map((row) => ({
				id: row.id,
				user_id: row.userId,
				gym_id: gymId,
				created_at: row.createdAt,
				latitude: -23.5505,
				longitude: -46.6333,
			})),
		})
		await insertInChunks(
			mongoCheckInsCollection,
			checkInRows.map((row) => ({
				_id: row.id,
				user_id: row.userId,
				gym_id: gymId,
				created_at: row.createdAt,
				dayKey: row.id,
			})),
		)

		prismaCheckIns = new PrismaAnalyticsCheckInRepository(prismaClient)
		prismaUsers = new PrismaAnalyticsUserRepository(prismaClient)
		mongoCheckIns = new MongoAnalyticsCheckInRepository(connection)
		mongoUsers = new MongoAnalyticsUserRepository(connection)
	}, 120_000)

	afterAll(async () => {
		await seeder.cleanup()
		await prismaClient.user.deleteMany({
			where: { id: { in: syntheticUsers.map((user) => user.id) } },
		})
		await prismaClient.$disconnect()
		await connection.client().db(dbName).dropDatabase()
		await connection.disconnect()
	})

	it("AC-09: check-in analytics are equal for a daily period", async () => {
		const period = periodOf("30d")

		const fromPrisma = await prismaCheckIns.fetchCheckInAnalytics(period)
		const fromMongo = await mongoCheckIns.fetchCheckInAnalytics(period)

		expect(fromMongo).toEqual(fromPrisma)
		expect(fromMongo.totalCheckIns).toBeGreaterThanOrEqual(3)
		expect(fromMongo.dailySeries.length).toBeGreaterThan(0)
		expect(fromMongo.hourlyDistribution.length).toBeGreaterThan(0)
	})

	it("AC-09: check-in analytics are equal for a period grouped by week", async () => {
		const period = periodOf("12m")

		expect(await mongoCheckIns.fetchCheckInAnalytics(period)).toEqual(
			await prismaCheckIns.fetchCheckInAnalytics(period),
		)
	})

	it("AC-09: growth analytics are equal for a daily period", async () => {
		const period = periodOf("7d")

		const fromPrisma = await prismaUsers.fetchGrowthAnalytics(period)
		const fromMongo = await mongoUsers.fetchGrowthAnalytics(period)

		expect(fromMongo).toEqual(fromPrisma)
		expect(fromMongo.newMembersCount).toBeGreaterThanOrEqual(2)
		expect(fromMongo.newMembersPerPeriod.length).toBeGreaterThan(0)
		expect(fromMongo.activeMembersTrend.length).toBeGreaterThan(0)
	})

	it("AC-09: growth analytics are equal for a period grouped by week (Monday start)", async () => {
		const period = periodOf("3m")

		const fromPrisma = await prismaUsers.fetchGrowthAnalytics(period)
		const fromMongo = await mongoUsers.fetchGrowthAnalytics(period)

		expect(fromMongo).toEqual(fromPrisma)
		expect(fromMongo.totalMembers).toBeGreaterThanOrEqual(syntheticUsers.length)
	})

	it("AC-09: retention analytics are equal, including the oldest at-risk members", async () => {
		const period = periodOf("30d")

		const fromPrisma = await prismaUsers.fetchRetentionAnalytics(period)
		const fromMongo = await mongoUsers.fetchRetentionAnalytics(period)

		expect(fromMongo.activeCount).toBe(fromPrisma.activeCount)
		expect(fromMongo.inactiveCount).toBe(fromPrisma.inactiveCount)
		expect(fromMongo.churnRate).toBe(fromPrisma.churnRate)
		expect(fromMongo.atRiskMembers).toHaveLength(fromPrisma.atRiskMembers.length)
		// The two oldest last check-ins (401 and 400 days) are older than anything already stored,
		// so their position at the top of the "days since" ordering is deterministic in both adapters.
		const expectedOldest = [
			{ id: inactiveOlder.id, name: inactiveOlder.name, daysSinceLastCheckIn: 401 },
			{ id: inactiveOld.id, name: inactiveOld.name, daysSinceLastCheckIn: 400 },
		]
		expect(fromPrisma.atRiskMembers.slice(0, 2)).toEqual(expectedOldest)
		expect(fromMongo.atRiskMembers.slice(0, 2)).toEqual(expectedOldest)
		expect(fromMongo.atRiskMembers.map((member) => member.id)).not.toContain(
			activeRecent.id,
		)
	})
})
```

(O teste de retenção compara os campos agregados por igualdade e as duas entradas mais antigas por valor esperado: a lista `atRiskMembers` é cortada em 50 e os empates de `days_since` entre dados já existentes são ordenados de forma arbitrária pelo Postgres, então só as posições determinísticas são comparadas por id. Se a base de desenvolvimento tiver check-ins com mais de 400 dias, aumentar os dois valores sintéticos acima do maior `days_since` existente.)

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-analytics.parity.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-analytics-check-in-repository""

- **Step 3: Write minimal implementation**

`apps/backend/src/shared/infra/database/repository/mongo/mongo-analytics-check-in-repository.ts`:

```ts
import { inject, injectable } from "inversify"
import type {
	AnalyticsCheckInRepository,
	CheckInAnalytics,
	DailyCount,
	HourlyCount,
} from "@/analytics/application/repository/analytics-check-in-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

@injectable()
export class MongoAnalyticsCheckInRepository
	implements AnalyticsCheckInRepository
{
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async fetchCheckInAnalytics(
		period: AnalyticsPeriod,
	): Promise<CheckInAnalytics> {
		const { from, to } = period
		const checkIns = this.connection.collection<CheckInDocument>(
			COLLECTIONS.CHECK_INS,
		)
		const match = { created_at: { $gte: from, $lte: to } }

		const [totalCheckIns, dailySeries, hourlyDistribution] = await Promise.all([
			checkIns.countDocuments(match),
			checkIns
				.aggregate<{ _id: string; count: number }>([
					{ $match: match },
					{
						$group: {
							_id: {
								$dateToString: {
									format: "%Y-%m-%d",
									date: "$created_at",
									timezone: "UTC",
								},
							},
							count: { $sum: 1 },
						},
					},
					{ $sort: { _id: 1 } },
				])
				.toArray(),
			checkIns
				.aggregate<{ _id: number; count: number }>([
					{ $match: match },
					{
						$group: {
							_id: { $hour: { date: "$created_at", timezone: "UTC" } },
							count: { $sum: 1 },
						},
					},
					{ $sort: { _id: 1 } },
				])
				.toArray(),
		])

		return {
			totalCheckIns,
			dailySeries: dailySeries.map(
				(row): DailyCount => ({ date: row._id, count: row.count }),
			),
			hourlyDistribution: hourlyDistribution.map(
				(row): HourlyCount => ({ hour: row._id, count: row.count }),
			),
		}
	}
}
```

`apps/backend/src/shared/infra/database/repository/mongo/mongo-analytics-user-repository.ts`:

```ts
import { inject, injectable } from "inversify"
import type { Document } from "mongodb"
import type {
	AnalyticsUserRepository,
	AtRiskMember,
	GrowthAnalytics,
	PeriodCount,
	RetentionAnalytics,
} from "@/analytics/application/repository/analytics-user-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

const DAY_MS = 24 * 3_600_000
const AT_RISK_LIMIT = 50

type CountRow = { count: number }
type BucketRow = { _id: string; count: number }
type AtRiskRow = { _id: string; name: string; last_check_in: Date }

@injectable()
export class MongoAnalyticsUserRepository implements AnalyticsUserRepository {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	// Retention windows are fixed by business definition: active = last 30 days, at-risk = no check-in in 14 days.
	// The period parameter is part of the repository contract but intentionally unused here.
	public async fetchRetentionAnalytics(
		_period: AnalyticsPeriod,
	): Promise<RetentionAnalytics> {
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
		const fourteenDaysAgo = new Date()
		fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
		const checkIns = this.checkIns()

		const [activeRows, atRiskRows, totalUsers] = await Promise.all([
			checkIns
				.aggregate<CountRow>([
					{ $match: { created_at: { $gte: thirtyDaysAgo } } },
					{ $group: { _id: "$user_id" } },
					{ $count: "count" },
				])
				.toArray(),
			checkIns
				.aggregate<AtRiskRow>([
					{ $group: { _id: "$user_id", last_check_in: { $max: "$created_at" } } },
					{ $match: { last_check_in: { $lt: fourteenDaysAgo } } },
					{
						$lookup: {
							from: COLLECTIONS.USERS,
							localField: "_id",
							foreignField: "_id",
							as: "user",
						},
					},
					{ $unwind: "$user" },
					{ $sort: { last_check_in: 1, _id: 1 } },
					{ $limit: AT_RISK_LIMIT },
					{ $project: { name: "$user.name", last_check_in: 1 } },
				])
				.toArray(),
			this.users().countDocuments({}),
		])

		const activeCount = activeRows[0]?.count ?? 0
		const inactiveCount = Math.max(0, totalUsers - activeCount)
		const churnRate = totalUsers > 0 ? (inactiveCount / totalUsers) * 100 : 0
		const now = Date.now()

		return {
			activeCount,
			inactiveCount,
			churnRate: Math.round(churnRate * 100) / 100,
			atRiskMembers: atRiskRows.map(
				(row): AtRiskMember => ({
					id: row._id,
					name: row.name,
					daysSinceLastCheckIn: Math.floor(
						(now - row.last_check_in.getTime()) / DAY_MS,
					),
				}),
			),
		}
	}

	public async fetchGrowthAnalytics(
		period: AnalyticsPeriod,
	): Promise<GrowthAnalytics> {
		const { from, to } = period
		const bucket = this.bucketExpression(period.shouldAggregateByWeek())
		const rangeMatch = { created_at: { $gte: from, $lte: to } }

		const [
			totalMembers,
			newMembersCount,
			newMembersPerPeriod,
			activeMembersTrend,
		] = await Promise.all([
			this.users().countDocuments({ created_at: { $lte: to } }),
			this.users().countDocuments(rangeMatch),
			this.users()
				.aggregate<BucketRow>([
					{ $match: rangeMatch },
					{ $group: { _id: bucket, count: { $sum: 1 } } },
					{ $sort: { _id: 1 } },
				])
				.toArray(),
			this.checkIns()
				.aggregate<BucketRow>([
					{ $match: rangeMatch },
					{ $group: { _id: { bucket, user: "$user_id" } } },
					{ $group: { _id: "$_id.bucket", count: { $sum: 1 } } },
					{ $sort: { _id: 1 } },
				])
				.toArray(),
		])

		return {
			totalMembers,
			newMembersCount,
			newMembersPerPeriod: newMembersPerPeriod.map(
				(row): PeriodCount => ({ date: row._id, count: row.count }),
			),
			activeMembersTrend: activeMembersTrend.map(
				(row): PeriodCount => ({ date: row._id, count: row.count }),
			),
		}
	}

	private bucketExpression(byWeek: boolean): Document {
		const truncate: Document = {
			date: "$created_at",
			unit: byWeek ? "week" : "day",
			timezone: "UTC",
		}
		if (byWeek) truncate.startOfWeek = "monday"
		return {
			$dateToString: {
				format: "%Y-%m-%d",
				timezone: "UTC",
				date: { $dateTrunc: truncate },
			},
		}
	}

	private users() {
		return this.connection.collection<UserDocument>(COLLECTIONS.USERS)
	}

	private checkIns() {
		return this.connection.collection<CheckInDocument>(COLLECTIONS.CHECK_INS)
	}
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-analytics.parity.integration-test.ts`
Expected: PASS (5 testes; exige Postgres e o MongoDB do compose; o teste espelha o Postgres atual numa base Mongo descartável e a remove no final)

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/shared/infra/database/repository/mongo
git commit -m "feat(backend): repositórios de analytics no Mongo com aggregation pipeline"
```

## Critérios de Sucesso

- AC-09 [int]: WHEN as analytics rodam nos dois providers sobre os mesmos dados THEN os resultados são iguais
- Risco: Resultado de analytics diferente do SQL
- FR-011: `fetchCheckInAnalytics`, `fetchRetentionAnalytics` e `fetchGrowthAnalytics` do Mongo devolvem os mesmos números do Prisma para períodos diários (`7d`, `30d`) e semanais (`3m`, `12m`, semana começando na segunda-feira, datas em UTC).
- A retenção usa as janelas fixas de 30 e 14 dias, `LIMIT 50`, `days_since` inteiro e `churnRate` arredondado a duas casas, sem filtrar `deleted_at` no total de usuários, como o SQL do Prisma.
