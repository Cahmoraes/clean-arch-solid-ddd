import { randomUUID } from "node:crypto"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { runInTransaction } from "./mongo-session"
import { MongoUnitOfWork } from "./mongo-unit-of-work"

interface TestDocument {
	_id: string
	n?: number
	user_id?: string
	dayKey?: string
	created_at?: Date
	billing_subscription_id?: string
	status?: string
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve: () => void = () => {}
	const promise = new Promise<void>((done) => {
		resolve = done
	})
	return { promise, resolve }
}

describe("MongoUnitOfWork", () => {
	let connection: MongoConnection
	let sut: MongoUnitOfWork
	const checkInIds: string[] = []
	const subscriptionIds: string[] = []

	function checkInTestDocument(id: string): TestDocument {
		return {
			_id: id,
			user_id: randomUUID(),
			dayKey: "2000-01-01",
			created_at: new Date("2000-01-01T12:00:00.000Z"),
		}
	}

	function subscriptionTestDocument(id: string): TestDocument {
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
			.collection<TestDocument>(COLLECTIONS.CHECK_INS)
			.deleteMany({ _id: { $in: checkInIds.splice(0) } })
		await connection
			.collection<TestDocument>(COLLECTIONS.SUBSCRIPTIONS)
			.deleteMany({ _id: { $in: subscriptionIds.splice(0) } })
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	it("AC-03: nothing stays written when a step fails inside runTransaction", async () => {
		const checkIns = connection.collection<TestDocument>(COLLECTIONS.CHECK_INS)
		const subscriptions = connection.collection<TestDocument>(
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
				await checkIns.insertOne(checkInTestDocument(checkInId), {
					session: tx,
				})
				await subscriptions.insertOne(
					subscriptionTestDocument(subscriptionId),
					{
						session: tx,
					},
				)
				throw new Error("step failed")
			}),
		).rejects.toThrow("step failed")

		expect(await checkIns.countDocuments({ _id: checkInId })).toBe(0)
		expect(await subscriptions.countDocuments({ _id: subscriptionId })).toBe(0)
	})

	it("FR-008: commits every write when the callback succeeds and returns its value", async () => {
		const checkIns = connection.collection<TestDocument>(COLLECTIONS.CHECK_INS)
		const subscriptions = connection.collection<TestDocument>(
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
			await checkIns.insertOne(checkInTestDocument(checkInId), { session: tx })
			await subscriptions.insertOne(subscriptionTestDocument(subscriptionId), {
				session: tx,
			})
			return "done"
		})

		expect(result).toBe("done")
		expect(await checkIns.countDocuments({ _id: checkInId })).toBe(1)
		expect(await subscriptions.countDocuments({ _id: subscriptionId })).toBe(1)
	})

	it("FR-008: retries the callback on a transient write conflict until both increments persist", async () => {
		const checkIns = connection.collection<TestDocument>(COLLECTIONS.CHECK_INS)
		const counterId = randomUUID()
		checkInIds.push(counterId)
		await checkIns.insertOne({ ...checkInTestDocument(counterId), n: 0 })
		const firstHasWritten = deferred()
		const secondHasRetried = deferred()
		let secondAttempts = 0

		const increment = (session: unknown) => {
			if (!MongoUnitOfWork.isClientSession(session)) {
				throw new Error("expected a Mongo session")
			}
			return checkIns.updateOne(
				{ _id: counterId },
				{ $inc: { n: 1 } },
				{ session },
			)
		}
		// The first transaction holds the write lock on the counter until the second
		// one has hit the conflict and started again: the retry is forced, not timed.
		const first = sut.runTransaction(async (tx) => {
			await increment(tx)
			firstHasWritten.resolve()
			await secondHasRetried.promise
		})
		await firstHasWritten.promise
		const second = sut.runTransaction(async (tx) => {
			secondAttempts += 1
			if (secondAttempts > 1) secondHasRetried.resolve()
			await increment(tx)
		})
		await Promise.all([first, second])

		const counter = await checkIns.findOne({ _id: counterId })
		expect(counter?.n).toBe(2)
		expect(secondAttempts).toBeGreaterThan(1)
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
			const received = await runInTransaction(
				connection,
				tx,
				async (session) => session,
			)
			expect(received).toBe(tx)
		})
	})

	it("runInTransaction opens its own transaction and rolls back when no session is given", async () => {
		const checkIns = connection.collection<TestDocument>(COLLECTIONS.CHECK_INS)
		const rolledBackId = randomUUID()
		const committedId = randomUUID()
		checkInIds.push(rolledBackId, committedId)

		await expect(
			runInTransaction(connection, undefined, async (session) => {
				await checkIns.insertOne(checkInTestDocument(rolledBackId), { session })
				throw new Error("own transaction failed")
			}),
		).rejects.toThrow("own transaction failed")
		await runInTransaction(connection, undefined, (session) =>
			checkIns.insertOne(checkInTestDocument(committedId), { session }),
		)

		expect(await checkIns.countDocuments({ _id: rolledBackId })).toBe(0)
		expect(await checkIns.countDocuments({ _id: committedId })).toBe(1)
	})
})
