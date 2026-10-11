import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import {
	buildSubscriptionProps,
	describeSubscriptionRepositoryContract,
	type SubscriptionProps,
} from "test/repository-contract/subscription-repository-contract"
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
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
import { Subscription } from "@/subscription/domain/subscription"
import {
	MongoSubscriptionRepository,
	type SubscriptionDocument,
} from "./mongo-subscription-repository"

describe("MongoSubscriptionRepository", () => {
	let connection: MongoConnection
	let repository: MongoSubscriptionRepository
	const recorder = new IdRecorder()

	function buildSubscription(
		userId: string,
		overrides: Partial<SubscriptionProps> = {},
	): Subscription {
		const id = overrides.id ?? recorder.newId()
		return Subscription.restore(buildSubscriptionProps(id, userId, overrides))
	}

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.SUBSCRIPTIONS, fields: ["_id", "user_id"] },
		])
	}

	async function caughtError(operation: Promise<unknown>): Promise<unknown> {
		return operation.then(
			() => undefined,
			(caught: unknown) => caught,
		)
	}

	function violatedFields(error: unknown): string[] {
		return isDuplicateKeyError(error) ? duplicateKeyFields(error) : []
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoSubscriptionRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeSubscriptionRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoSubscriptionRepository(connection),
			newId: () => contractRecorder.newId(),
			ensureReferences: async () => {},
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.SUBSCRIPTIONS, fields: ["_id", "user_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-03: the partial unique index rejects a second active subscription of the same user with ActiveSubscriptionAlreadyExistsError", async () => {
			const userId = recorder.newId()
			await repository.save(buildSubscription(userId))

			const error = await caughtError(
				repository.save(buildSubscription(userId)),
			)

			expect(error).toBeInstanceOf(ActiveSubscriptionAlreadyExistsError)
			if (!(error instanceof ActiveSubscriptionAlreadyExistsError)) return
			expect(violatedFields(error.cause)).toEqual(["user_id"])
		})

		it("INV-03: a canceled subscription and a new active one coexist for the same user", async () => {
			const userId = recorder.newId()
			await repository.save(buildSubscription(userId, { status: "canceled" }))

			await expect(
				repository.save(buildSubscription(userId)),
			).resolves.toBeUndefined()
		})

		it("INV-02: the unique index rejects a second subscription with the same billing subscription id", async () => {
			const first = buildSubscription(recorder.newId())
			await repository.save(first)

			const error = await caughtError(
				repository.save(
					buildSubscription(recorder.newId(), {
						billingSubscriptionId: first.billingSubscriptionId,
					}),
				),
			)

			expect(isDuplicateKeyError(error)).toBe(true)
			if (!isDuplicateKeyError(error)) return
			expect(duplicateKeyFields(error)).toEqual(["billing_subscription_id"])
		})

		it("INV-04: closing the expired subscription and creating the new one commit together", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const userId = recorder.newId()
			const expired = buildSubscription(userId, {
				currentPeriodEnd: new Date("2026-05-31T00:00:00.000Z"),
			})
			await repository.save(expired)
			const closed = buildSubscription(userId, {
				id: expired.id,
				billingSubscriptionId: expired.billingSubscriptionId,
				status: "canceled",
				canceledAt: new Date("2026-06-01T00:00:00.000Z"),
			})
			const renewed = buildSubscription(userId)

			await unitOfWork.runTransaction(async (tx) => {
				const transactional = repository.withTransaction(tx)
				await transactional.update(closed)
				await transactional.save(renewed)
			})

			expect((await repository.ofUserId(userId))?.id).toBe(renewed.id)
			expect(
				(
					await repository.ofBillingSubscriptionId(
						expired.billingSubscriptionId,
					)
				)?.status,
			).toBe("canceled")
		})

		it("INV-04: when creating the new subscription fails, the expired one stays active", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const userId = recorder.newId()
			const expired = buildSubscription(userId)
			await repository.save(expired)
			const closed = buildSubscription(userId, {
				id: expired.id,
				billingSubscriptionId: expired.billingSubscriptionId,
				status: "canceled",
				canceledAt: new Date("2026-06-01T00:00:00.000Z"),
			})
			const clashingRenewal = buildSubscription(userId, {
				billingSubscriptionId: expired.billingSubscriptionId,
			})

			const error = await caughtError(
				unitOfWork.runTransaction(async (tx) => {
					const transactional = repository.withTransaction(tx)
					await transactional.update(closed)
					await transactional.save(clashingRenewal)
				}),
			)

			expect(isDuplicateKeyError(error)).toBe(true)
			expect((await repository.ofUserId(userId))?.id).toBe(expired.id)
			expect(
				(
					await repository.ofBillingSubscriptionId(
						expired.billingSubscriptionId,
					)
				)?.status,
			).toBe("active")
		})

		it("update writes only status, plan, cancel flag, canceled date and updated date", async () => {
			const userId = recorder.newId()
			const original = buildSubscription(userId)
			await repository.save(original)

			await repository.update(
				buildSubscription(userId, {
					id: original.id,
					billingSubscriptionId: "sub_other",
					customerId: "cus_other",
					status: "past_due",
				}),
			)

			const document = await connection
				.collection<SubscriptionDocument>(COLLECTIONS.SUBSCRIPTIONS)
				.findOne({ _id: original.id })
			expect(document).toMatchObject({
				status: "past_due",
				billing_subscription_id: original.billingSubscriptionId,
				customer_id: original.customerId,
			})
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})
	})
})
