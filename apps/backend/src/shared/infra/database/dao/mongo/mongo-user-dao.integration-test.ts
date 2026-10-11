import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserDaoContract } from "test/repository-contract/user-dao-contract"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { MongoUserDao } from "./mongo-user-dao"

describe("MongoUserDao", () => {
	let connection: MongoConnection

	function toDocument(user: {
		id: string
		name: string
		email: string
		role: UserDocument["role"]
		status: UserDocument["status"]
		createdAt: Date
		isSuperAdmin: boolean
		deletedAt: Date | null
	}): UserDocument {
		return {
			_id: user.id,
			name: user.name,
			email: user.email,
			password_hash: null,
			google_id: null,
			created_at: user.createdAt,
			role: user.role,
			updated_at: user.createdAt,
			status: user.status,
			billing_customer_id: null,
			is_super_admin: user.isSuperAdmin,
			deleted_at: user.deletedAt,
		}
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeUserDaoContract("mongo", async () => {
		const recorder = new IdRecorder()
		return {
			dao: new MongoUserDao(connection),
			newId: () => recorder.newId(),
			seed: async (users) => {
				await connection
					.collection<UserDocument>(COLLECTIONS.USERS)
					.insertMany(users.map(toDocument))
			},
			cleanup: () =>
				deleteDocumentsReferencing(connection, recorder.ids, [
					{ collection: COLLECTIONS.USERS, fields: ["_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		it("treats regular expression metacharacters in the query as literal text", async () => {
			const recorder = new IdRecorder()
			const token = recorder.newId().slice(0, 8)
			const literal = recorder.newId()
			const lookalike = recorder.newId()
			const base = {
				role: "MEMBER" as const,
				status: "activated" as const,
				createdAt: new Date("2026-03-01T10:00:00.000Z"),
				isSuperAdmin: false,
				deletedAt: null,
			}
			await connection.collection<UserDocument>(COLLECTIONS.USERS).insertMany([
				toDocument({
					...base,
					id: literal,
					name: `${token} a.b`,
					email: `${literal}@dao.test`,
				}),
				toDocument({
					...base,
					id: lookalike,
					name: `${token} aXb`,
					email: `${lookalike}@dao.test`,
				}),
			])
			try {
				const output = await new MongoUserDao(connection).fetchAndCountUsers({
					page: 1,
					limit: 10,
					query: `${token} a.b`,
				})
				expect(output.usersData.map((user) => user.id)).toEqual([literal])
			} finally {
				await deleteDocumentsReferencing(connection, recorder.ids, [
					{ collection: COLLECTIONS.USERS, fields: ["_id"] },
				])
			}
		})
	})
})
