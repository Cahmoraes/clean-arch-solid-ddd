import { randomUUID } from "node:crypto"
import { isDeepStrictEqual } from "node:util"
import type { Document } from "mongodb"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { MongoGymRepository } from "@/shared/infra/database/repository/mongo/mongo-gym-repository"
import { runEtl } from "./etl-runner"
import type { EtlCollection, EtlDocument, EtlReport } from "./etl-types"
import { ETL_COLLECTIONS } from "./etl-types"
import { PrismaEtlSource } from "./prisma-etl-source"

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

async function dump(
	connection: MongoConnection,
): Promise<Record<string, Document[]>> {
	const result: Record<string, Document[]> = {}
	for (const collection of ETL_COLLECTIONS) {
		result[collection] = await connection
			.collection<EtlDocument>(MONGO_COLLECTION[collection])
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
				cnpj: Array.from({ length: 14 }, () =>
					Math.floor(Math.random() * 10),
				).join(""),
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
		// beforeAll may have failed before the Mongo connection existed: clean up whatever was created.
		try {
			await prismaClient.checkIn.deleteMany({ where: { id: checkInId } })
			await prismaClient.gym.deleteMany({ where: { id: gymId } })
			await prismaClient.user.deleteMany({
				where: { id: { in: [userId, deletedUserId] } },
			})
		} finally {
			await prismaClient.$disconnect()
			if (connection) {
				await connection.client().db(dbName).dropDatabase()
				await connection.disconnect()
			}
		}
	})

	it("Review Focus: running the ETL again leaves every collection identical", () => {
		expect(secondDump).toEqual(firstDump)
		expect(
			isDeepStrictEqual(secondReport.collections, firstReport.collections),
		).toBe(true)
	})

	it("Review Focus: deleted_at, decimal coordinates and operating_hours keep their value and type", async () => {
		const users = connection.collection<EtlDocument>(COLLECTIONS.USERS)
		const gyms = connection.collection<EtlDocument>(COLLECTIONS.GYMS)

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
				expect(entry.excluded + entry.mongoCount).toBe(
					await tableCounts[collection](),
				)
				expect(entry.sampleMismatches).toEqual([])
			}
			expect(report.ok).toBe(true)
		}
	})

	it("INV-08: the copied user, gym and check-in keep the id and every field", async () => {
		const user = await prismaClient.user.findUniqueOrThrow({
			where: { id: deletedUserId },
		})
		const gym = await prismaClient.gym.findUniqueOrThrow({
			where: { id: gymId },
		})
		const checkIn = await prismaClient.checkIn.findUniqueOrThrow({
			where: { id: checkInId },
		})

		const userDocument = await connection
			.collection<EtlDocument>(COLLECTIONS.USERS)
			.findOne({ _id: deletedUserId })
		const gymDocument = await connection
			.collection<EtlDocument>(COLLECTIONS.GYMS)
			.findOne({ _id: gymId })
		const checkInDocument = await connection
			.collection<EtlDocument>(COLLECTIONS.CHECK_INS)
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
			location: {
				type: "Point",
				coordinates: [gym.longitude.toNumber(), gym.latitude.toNumber()],
			},
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
