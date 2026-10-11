import { randomUUID } from "node:crypto"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeStripeWebhookEventRepositoryContract } from "test/repository-contract/stripe-webhook-event-repository-contract"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
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
import {
	MongoStripeWebhookEventRepository,
	type StripeWebhookEventDocument,
} from "./mongo-stripe-webhook-event-repository"

describe("MongoStripeWebhookEventRepository", () => {
	let connection: MongoConnection
	let repository: MongoStripeWebhookEventRepository
	const recorder = new IdRecorder()

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.STRIPE_WEBHOOK_EVENTS, fields: ["event_id"] },
		])
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoStripeWebhookEventRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeStripeWebhookEventRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoStripeWebhookEventRepository(connection),
			newId: () => contractRecorder.newId(),
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{
						collection: COLLECTIONS.STRIPE_WEBHOOK_EVENTS,
						fields: ["event_id"],
					},
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-07: the unique index rejects a second document with the same event_id", async () => {
			const eventId = recorder.newId()
			const events = connection.collection<StripeWebhookEventDocument>(
				COLLECTIONS.STRIPE_WEBHOOK_EVENTS,
			)
			await events.insertOne({
				_id: randomUUID(),
				event_id: eventId,
				event_type: "invoice.paid",
				processed_at: new Date(),
			})

			const error = await events
				.insertOne({
					_id: randomUUID(),
					event_id: eventId,
					event_type: "invoice.paid",
					processed_at: new Date(),
				})
				.then(
					() => undefined,
					(caught: unknown) => caught,
				)

			expect(isDuplicateKeyError(error)).toBe(true)
			if (!isDuplicateKeyError(error)) return
			expect(duplicateKeyFields(error)).toEqual(["event_id"])
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("a rolled back transaction leaves the event unmarked so it can be processed again", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const eventId = recorder.newId()

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository
						.withTransaction(tx)
						.markAsProcessed(eventId, "invoice.paid")
					throw new Error("worker failed")
				}),
			).rejects.toThrow("worker failed")

			await expect(
				repository.markAsProcessed(eventId, "invoice.paid"),
			).resolves.toBeUndefined()
		})
	})
})
