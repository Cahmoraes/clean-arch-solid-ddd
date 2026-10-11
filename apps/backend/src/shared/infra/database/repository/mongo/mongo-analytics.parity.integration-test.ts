import { randomUUID } from "node:crypto"
import type { Collection, Document } from "mongodb"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
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

type SyntheticUser = { id: string; name: string; createdDaysAgo: number }

async function mirrorExistingPostgresData(
	users: Collection<Document>,
	checkIns: Collection<Document>,
): Promise<void> {
	const existingUsers = await prismaClient.user.findMany({
		select: { id: true, name: true, email: true, created_at: true },
	})
	await insertInChunks(
		users,
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
		checkIns,
		existingCheckIns.map((checkIn) => ({
			_id: checkIn.id,
			user_id: checkIn.user_id,
			gym_id: checkIn.gym_id,
			created_at: checkIn.created_at,
			// Analytics never read dayKey; the id keeps legacy same-day rows from tripping the unique index.
			dayKey: checkIn.id,
		})),
	)
}

async function seedSyntheticUsers(
	users: Collection<Document>,
	syntheticUsers: SyntheticUser[],
): Promise<void> {
	const rows = syntheticUsers.map((user) => ({
		id: user.id,
		name: user.name,
		email: `${user.id}@parity.test`,
		created_at: daysAgo(user.createdDaysAgo),
	}))
	await prismaClient.user.createMany({
		data: rows.map((row) => ({
			...row,
			role: "MEMBER" as const,
			status: "activated" as const,
		})),
	})
	await insertInChunks(
		users,
		rows.map(({ id, ...rest }) => ({ _id: id, ...rest })),
	)
}

async function seedSyntheticCheckIns(
	checkIns: Collection<Document>,
	rows: { id: string; userId: string; gymId: string; createdAt: Date }[],
): Promise<void> {
	await prismaClient.checkIn.createMany({
		data: rows.map((row) => ({
			id: row.id,
			user_id: row.userId,
			gym_id: row.gymId,
			created_at: row.createdAt,
			latitude: -23.5505,
			longitude: -46.6333,
		})),
	})
	await insertInChunks(
		checkIns,
		rows.map((row) => ({
			_id: row.id,
			user_id: row.userId,
			gym_id: row.gymId,
			created_at: row.createdAt,
			dayKey: row.id,
		})),
	)
}

describe("analytics parity (Prisma x Mongo)", () => {
	let connection: MongoConnection
	const dbName = `analytics_parity_${randomUUID().replaceAll("-", "")}`
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)

	const activeRecent = {
		id: "",
		name: "Parity Active Recent",
		createdDaysAgo: 2,
	}
	const activeBoundary = {
		id: "",
		name: "Parity Active Boundary",
		createdDaysAgo: 10,
	}
	const inactiveOld = {
		id: "",
		name: "Parity Inactive Old",
		createdDaysAgo: 450,
	}
	const inactiveOlder = {
		id: "",
		name: "Parity Inactive Older",
		createdDaysAgo: 460,
	}
	const noCheckIn = { id: "", name: "Parity No Check-in", createdDaysAgo: 1 }
	const syntheticUsers = [
		activeRecent,
		activeBoundary,
		inactiveOld,
		inactiveOlder,
		noCheckIn,
	]
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
		const mongoUsersCollection = connection.collection<Document>(
			COLLECTIONS.USERS,
		)
		const mongoCheckInsCollection = connection.collection<Document>(
			COLLECTIONS.CHECK_INS,
		)

		// 1. Mirror what Postgres already holds into the throwaway Mongo database.
		await mirrorExistingPostgresData(
			mongoUsersCollection,
			mongoCheckInsCollection,
		)

		// 2. Add the same synthetic rows to both databases.
		const gymId = recorder.newId()
		await seeder.ensureGyms([gymId])
		for (const user of syntheticUsers) user.id = recorder.newId()
		await seedSyntheticUsers(mongoUsersCollection, syntheticUsers)
		await seedSyntheticCheckIns(
			mongoCheckInsCollection,
			syntheticCheckIns.map((checkIn) => ({
				id: recorder.newId(),
				userId: syntheticUsers[checkIn.userIndex].id,
				gymId,
				createdAt: daysAgo(checkIn.daysAgo),
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
		expect(fromMongo.atRiskMembers).toHaveLength(
			fromPrisma.atRiskMembers.length,
		)
		// The two oldest last check-ins (401 and 400 days) are older than anything already stored,
		// so their position at the top of the "days since" ordering is deterministic in both adapters.
		const expectedOldest = [
			{
				id: inactiveOlder.id,
				name: inactiveOlder.name,
				daysSinceLastCheckIn: 401,
			},
			{ id: inactiveOld.id, name: inactiveOld.name, daysSinceLastCheckIn: 400 },
		]
		expect(fromPrisma.atRiskMembers.slice(0, 2)).toEqual(expectedOldest)
		expect(fromMongo.atRiskMembers.slice(0, 2)).toEqual(expectedOldest)
		expect(fromMongo.atRiskMembers.map((member) => member.id)).not.toContain(
			activeRecent.id,
		)
	})
})
