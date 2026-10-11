import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Gym } from "@/gym/domain/gym"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoGymRepository } from "@/shared/infra/database/repository/mongo/mongo-gym-repository"
import { MongoUserRepository } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { User } from "@/user/domain/user"
import { generateValidCnpjFromIndex } from "../../prisma/lib/brazilian-cnpj.js"
import { seedMongo } from "../seed-mongo"

const NOW = new Date("2026-06-15T10:00:00.000Z")
const THREE_DAYS_LATER = new Date("2026-06-18T10:00:00.000Z")

async function withDisposableDb(
	run: (connection: MongoConnection) => Promise<void>,
): Promise<void> {
	const name = `seed_${randomUUID().replaceAll("-", "")}`
	const disposable = await createTestMongoConnection(name)
	try {
		await run(disposable)
	} finally {
		await disposable.client().db(name).dropDatabase()
		await disposable.disconnect()
	}
}

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
		firstRun = await seedMongo(connection, { now: NOW })
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

	it("FR-018: creates 191 check-ins, 8 at most per member, that reference existing users and gyms", async () => {
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

		expect(firstRun.checkInsCreated).toBe(191)
		expect(await count(COLLECTIONS.CHECK_INS)).toBe(191)
		expect(perUser).toHaveLength(42)
		expect(Math.max(...perUser.map((row) => row.total))).toBe(8)
		const dates = checkIns.map((checkIn) => checkIn.created_at.getTime())
		expect(new Date(Math.min(...dates)).toISOString()).toBe(
			"2026-03-17T12:04:00.000Z",
		)
		expect(new Date(Math.max(...dates)).toISOString()).toBe(
			"2026-06-13T12:40:00.000Z",
		)
		expect(checkIns.every((checkIn) => userIds.has(checkIn.user_id))).toBe(true)
		expect(checkIns.every((checkIn) => gymIds.has(checkIn.gym_id))).toBe(true)
	})

	it("FR-018: running the seed again changes nothing, even on another UTC day", async () => {
		const snapshot = async () => ({
			users: await connection
				.collection<Document>(COLLECTIONS.USERS)
				.find({})
				.sort({ _id: 1 })
				.toArray(),
			gyms: await ids(COLLECTIONS.GYMS),
			checkIns: await connection
				.collection<Document>(COLLECTIONS.CHECK_INS)
				.find({})
				.sort({ _id: 1 })
				.toArray(),
		})
		const before = await snapshot()

		const secondRun = await seedMongo(connection, { now: THREE_DAYS_LATER })

		expect(secondRun.skippedRandomSeeding).toBe(true)
		expect(await snapshot()).toEqual(before)
	}, 60_000)

	it("FR-018: a run that died before the check-ins resumes and recreates them", async () => {
		await withDisposableDb(async (partial) => {
			await seedMongo(partial, { now: NOW })
			const checkIns = partial.collection<Document>(COLLECTIONS.CHECK_INS)
			const readCheckIns = () =>
				checkIns
					.find({}, { projection: { updated_at: 0 } })
					.sort({ _id: 1 })
					.toArray()
			const before = await readCheckIns()
			await checkIns.deleteMany({})

			const rerun = await seedMongo(partial, { now: THREE_DAYS_LATER })

			expect(rerun.skippedRandomSeeding).toBe(false)
			expect(rerun.usersCreated).toBe(0)
			expect(rerun.gymsCreated).toBe(0)
			expect(rerun.checkInsCreated).toBe(before.length)
			expect(await readCheckIns()).toEqual(before)
		})
	}, 180_000)

	it("FR-018: recreating the super admin does not shift the dates of a resumed run", async () => {
		await withDisposableDb(async (target) => {
			await seedMongo(target, { now: NOW })
			const users = target.collection<Document>(COLLECTIONS.USERS)
			const checkIns = target.collection<Document>(COLLECTIONS.CHECK_INS)
			const readCheckIns = () =>
				checkIns
					.find({}, { projection: { updated_at: 0 } })
					.sort({ _id: 1 })
					.toArray()
			const before = await readCheckIns()
			await users.deleteOne({ email: "admin@admin.com" })
			await checkIns.deleteMany({
				_id: { $in: before.slice(0, 5).map((checkIn) => checkIn._id) },
			})

			const rerun = await seedMongo(target, { now: THREE_DAYS_LATER })

			expect(rerun.checkInsCreated).toBe(5)
			expect(await readCheckIns()).toEqual(before)
		})
	}, 180_000)

	it("FR-018: a super admin created long before the seed does not push the check-ins out of the 90-day window", async () => {
		await withDisposableDb(async (target) => {
			const longAgo = new Date("2024-01-01T00:00:00.000Z")
			const admin = User.restore({
				id: randomUUID(),
				name: "Old Admin",
				email: "admin@admin.com",
				password: "hashed",
				createdAt: longAgo,
				updatedAt: longAgo,
				role: "ADMIN",
				status: "activated",
				isSuperAdmin: true,
			})
			const repository = new MongoUserRepository(target)
			await repository.save(admin)
			// save() does not write is_super_admin, so update() sets it.
			await repository.update(admin)

			await seedMongo(target, { now: NOW })

			const oldest = await target
				.collection<Document>(COLLECTIONS.CHECK_INS)
				.find({})
				.sort({ created_at: 1 })
				.limit(1)
				.next()
			const ninetyOneDays = 91 * 24 * 3_600_000
			expect(oldest).not.toBeNull()
			expect(
				NOW.getTime() - (oldest?.created_at as Date).getTime(),
			).toBeLessThanOrEqual(ninetyOneDays)
		})
	}, 180_000)

	it("FR-018: a run that died before all members were saved resumes and recreates them", async () => {
		await withDisposableDb(async (partial) => {
			await seedMongo(partial, { now: NOW })
			const users = partial.collection<Document>(COLLECTIONS.USERS)
			const removed = await users
				.find({ email: /^member/ })
				.limit(7)
				.toArray()
			await users.deleteMany({ _id: { $in: removed.map((user) => user._id) } })

			const rerun = await seedMongo(partial, { now: THREE_DAYS_LATER })

			expect(rerun.skippedRandomSeeding).toBe(false)
			expect(rerun.usersCreated).toBe(7)
			expect(rerun.gymsCreated).toBe(0)
			expect(rerun.checkInsCreated).toBe(0)
			expect(await users.countDocuments({})).toBe(51)
		})
	}, 180_000)

	it("FR-018: gyms created outside the seed do not stop the seed", async () => {
		await withDisposableDb(async (target) => {
			await new MongoGymRepository(target).save(
				Gym.restore({
					id: randomUUID(),
					cnpj: generateValidCnpjFromIndex(1000),
					title: "Outside Gym",
					description: "created through the API",
					phone: "11999999999",
					address: "Rua A, 1",
					latitude: -23.5,
					longitude: -46.6,
					status: "activated",
					operatingHours: null,
				}),
			)

			const run = await seedMongo(target, { now: NOW })

			expect(run.skippedRandomSeeding).toBe(false)
			expect(run.gymsCreated).toBe(50)
			expect(run.usersCreated).toBe(50)
			expect(
				await target.collection<Document>(COLLECTIONS.GYMS).countDocuments({}),
			).toBe(51)
		})
	}, 180_000)

	it("FR-018: after a partial run the seed completes the missing gyms without duplicates", async () => {
		await withDisposableDb(async (partial) => {
			await seedMongo(partial, { now: NOW })
			const gyms = partial.collection<Document>(COLLECTIONS.GYMS)
			const removed = await gyms.find({}).limit(10).toArray()
			await partial.collection<Document>(COLLECTIONS.CHECK_INS).deleteMany({
				gym_id: { $in: removed.map((gym) => gym._id) },
			})
			await gyms.deleteMany({ _id: { $in: removed.map((gym) => gym._id) } })

			const rerun = await seedMongo(partial, { now: THREE_DAYS_LATER })

			expect(rerun.skippedRandomSeeding).toBe(false)
			expect(await gyms.countDocuments({})).toBe(50)
			expect(rerun.gymsCreated).toBe(10)
			expect(
				await partial
					.collection<Document>(COLLECTIONS.USERS)
					.countDocuments({}),
			).toBe(51)
		})
	}, 180_000)
})
