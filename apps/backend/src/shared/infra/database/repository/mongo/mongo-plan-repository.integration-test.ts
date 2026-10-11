import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describePlanRepositoryContract } from "test/repository-contract/plan-repository-contract"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { Plan } from "@/subscription/domain/plan"
import { MongoPlanRepository, type PlanDocument } from "./mongo-plan-repository"

describe("MongoPlanRepository", () => {
	let connection: MongoConnection
	let repository: MongoPlanRepository
	const recorder = new IdRecorder()

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoPlanRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describePlanRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoPlanRepository(connection),
			newId: () => contractRecorder.newId(),
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.PLANS, fields: ["_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(async () => {
			await deleteDocumentsReferencing(connection, recorder.ids, [
				{ collection: COLLECTIONS.PLANS, fields: ["_id"] },
			])
		})

		it("stores the document with the Prisma column names and the features array", async () => {
			const id = recorder.newId()
			await repository.save(
				Plan.restore({
					id,
					name: "Mongo Plan",
					priceCents: 4990,
					billingPeriod: "yearly",
					tagline: "tag",
					features: ["a", "b"],
					isActive: true,
					stripePriceId: `price_${id}`,
				}),
			)

			const document = await connection
				.collection<PlanDocument>(COLLECTIONS.PLANS)
				.findOne({ _id: id })

			expect(document).toMatchObject({
				_id: id,
				name: "Mongo Plan",
				price_cents: 4990,
				billing_period: "yearly",
				tagline: "tag",
				features: ["a", "b"],
				is_active: true,
				stripe_price_id: `price_${id}`,
			})
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})
	})
})
