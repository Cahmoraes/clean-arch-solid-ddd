import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { describeActiveRecipientsProviderContract } from "test/repository-contract/active-recipients-provider-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { afterAll, beforeAll, describe } from "vitest"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { MongoActiveRecipientsProvider } from "./mongo-active-recipients.provider"

describe("MongoActiveRecipientsProvider", () => {
	let connection: MongoConnection

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeActiveRecipientsProviderContract("mongo", async () => {
		const recorder = new IdRecorder()
		return {
			provider: new MongoActiveRecipientsProvider(connection),
			newId: () => recorder.newId(),
			seed: async (users) => {
				await connection.collection<UserDocument>(COLLECTIONS.USERS).insertMany(
					users.map((user) => ({
						_id: user.id,
						name: "Recipient",
						email: `${user.id}@recipient.test`,
						password_hash: null,
						google_id: null,
						created_at: new Date("2026-03-01T10:00:00.000Z"),
						role: user.role,
						updated_at: new Date("2026-03-01T10:00:00.000Z"),
						status: user.status,
						billing_customer_id: null,
						is_super_admin: false,
						deleted_at: user.deleted
							? new Date("2026-04-01T00:00:00.000Z")
							: null,
					})),
				)
			},
			cleanup: () =>
				deleteDocumentsReferencing(connection, recorder.ids, [
					{ collection: COLLECTIONS.USERS, fields: ["_id"] },
				]),
		}
	})
})
