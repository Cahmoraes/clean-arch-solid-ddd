import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { seedMongo } from "../seed-mongo"

describe("seedMongo", () => {
	const dbName = `seed_${randomUUID().replaceAll("-", "")}`
	let connection: MongoConnection
	let firstRun: Awaited<ReturnType<typeof seedMongo>>

	function count(name: string): Promise<number> {
		return connection.collection<Document>(name).countDocuments({})
	}

	async function ids(name: string): Promise<string[]> {
		const documents = await connection
			.collection<Document>(name)
			.find({}, { projection: { _id: 1 } })
			.sort({ _id: 1 })
			.toArray()
		return documents.map((document) => String(document._id))
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection(dbName)
		firstRun = await seedMongo(connection)
	}, 120_000)

	afterAll(async () => {
		await connection.client().db(dbName).dropDatabase()
		await connection.disconnect()
	})

	it("FR-018: creates the super admin, 50 members and 50 gyms", async () => {
		expect(firstRun.skippedRandomSeeding).toBe(false)
		expect(await count(COLLECTIONS.USERS)).toBe(51)
		expect(await count(COLLECTIONS.GYMS)).toBe(50)
		expect(firstRun.usersCreated).toBe(50)
		expect(firstRun.gymsCreated).toBe(50)
		const superAdmin = await connection
			.collection<Document>(COLLECTIONS.USERS)
			.findOne({ email: firstRun.superAdminEmail })
		expect(superAdmin).toMatchObject({
			role: "ADMIN",
			status: "activated",
			is_super_admin: true,
			deleted_at: null,
		})
	})

	it("FR-018: gives each member at most 8 check-ins that reference existing users and gyms", async () => {
		const perUser = await connection
			.collection<Document>(COLLECTIONS.CHECK_INS)
			.aggregate<{ _id: string; total: number }>([
				{ $group: { _id: "$user_id", total: { $sum: 1 } } },
			])
			.toArray()
		const userIds = new Set(await ids(COLLECTIONS.USERS))
		const gymIds = new Set(await ids(COLLECTIONS.GYMS))
		const checkIns = await connection
			.collection<Document>(COLLECTIONS.CHECK_INS)
			.find({})
			.toArray()

		expect(firstRun.checkInsCreated).toBe(await count(COLLECTIONS.CHECK_INS))
		expect(perUser.every((row) => row.total <= 8)).toBe(true)
		expect(checkIns.every((checkIn) => userIds.has(checkIn.user_id))).toBe(true)
		expect(checkIns.every((checkIn) => gymIds.has(checkIn.gym_id))).toBe(true)
	})

	it("FR-018: running the seed again changes nothing", async () => {
		const before = {
			users: await ids(COLLECTIONS.USERS),
			gyms: await ids(COLLECTIONS.GYMS),
			checkIns: await ids(COLLECTIONS.CHECK_INS),
		}

		const secondRun = await seedMongo(connection)

		expect(secondRun.skippedRandomSeeding).toBe(true)
		expect(await ids(COLLECTIONS.USERS)).toEqual(before.users)
		expect(await ids(COLLECTIONS.GYMS)).toEqual(before.gyms)
		expect(await ids(COLLECTIONS.CHECK_INS)).toEqual(before.checkIns)
	}, 60_000)

	it("FR-018: after a partial run the seed completes the missing documents without duplicates", async () => {
		const partialDb = `seed_${randomUUID().replaceAll("-", "")}`
		const partial = await createTestMongoConnection(partialDb)
		try {
			await seedMongo(partial)
			const gyms = partial.collection<Document>(COLLECTIONS.GYMS)
			const removed = await gyms.find({}).limit(10).toArray()
			await partial.collection<Document>(COLLECTIONS.CHECK_INS).deleteMany({
				gym_id: { $in: removed.map((gym) => gym._id) },
			})
			await gyms.deleteMany({ _id: { $in: removed.map((gym) => gym._id) } })

			const rerun = await seedMongo(partial)

			expect(rerun.skippedRandomSeeding).toBe(false)
			expect(await gyms.countDocuments({})).toBe(50)
			expect(rerun.gymsCreated).toBe(10)
			expect(
				await partial
					.collection<Document>(COLLECTIONS.USERS)
					.countDocuments({}),
			).toBe(51)
		} finally {
			await partial.client().db(partialDb).dropDatabase()
			await partial.disconnect()
		}
	}, 180_000)
})
