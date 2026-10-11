import { randomUUID } from "node:crypto"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserRepositoryContract } from "test/repository-contract/user-repository-contract"
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
import { UserNotPersistedError } from "@/shared/infra/errors/user-not-persisted-error"
import { UserQuery } from "@/user/application/persistence/repository/user-query"
import { User } from "@/user/domain/user"
import { MongoUserRepository, type UserDocument } from "./mongo-user-repository"

type UserProps = Parameters<typeof User.restore>[0]

async function duplicateFieldsOf(
	operation: Promise<unknown>,
): Promise<string[]> {
	const error = await operation.then(
		() => undefined,
		(caught: unknown) => caught,
	)
	if (!isDuplicateKeyError(error))
		throw new Error("expected a duplicate key error")
	return duplicateKeyFields(error)
}

describe("MongoUserRepository", () => {
	let connection: MongoConnection
	let repository: MongoUserRepository
	const recorder = new IdRecorder()

	function buildUser(overrides: Partial<UserProps> = {}): User {
		const id = overrides.id ?? recorder.newId()
		return User.restore({
			id,
			name: "Mongo User",
			email: `${id}@mongo.test`,
			password: "hashed-password",
			createdAt: new Date("2026-01-10T12:00:00.000Z"),
			updatedAt: new Date("2026-01-10T12:00:00.000Z"),
			role: "MEMBER",
			status: "activated",
			isSuperAdmin: false,
			...overrides,
		})
	}

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.USERS, fields: ["_id"] },
		])
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoUserRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeUserRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoUserRepository(connection),
			newId: () => contractRecorder.newId(),
			missingRecordError: UserNotPersistedError,
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.USERS, fields: ["_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-02: the unique index rejects a second user with the same e-mail", async () => {
			const first = buildUser({ email: `${randomUUID()}@mongo.test` })
			await repository.save(first)
			const second = buildUser({ email: first.email })

			expect(await duplicateFieldsOf(repository.save(second))).toEqual([
				"email",
			])
		})

		it("INV-02: the unique index rejects a second user with the same Google id", async () => {
			const googleId = `google-${randomUUID()}`
			await repository.save(buildUser({ googleId }))

			expect(
				await duplicateFieldsOf(repository.save(buildUser({ googleId }))),
			).toEqual(["google_id"])
		})

		it("INV-02: the unique index rejects a second user with the same billing customer id", async () => {
			const billingCustomerId = `cus_${randomUUID()}`
			await repository.save(buildUser({ billingCustomerId }))

			expect(
				await duplicateFieldsOf(
					repository.save(buildUser({ billingCustomerId })),
				),
			).toEqual(["billing_customer_id"])
		})

		it("users without Google id or billing customer id do not collide on the partial unique indexes", async () => {
			await repository.save(buildUser())
			await expect(repository.save(buildUser())).resolves.toBeUndefined()
		})

		it("AC-02: a repeated e-mail is found by the lookup the use case runs first, and the index blocks the second insert", async () => {
			const first = buildUser()
			await repository.save(first)

			const existing = await repository.userOfEmail(first.email)
			const failedFields = await duplicateFieldsOf(
				repository.save(buildUser({ email: first.email })),
			)

			expect(existing?.id).toBe(first.id)
			expect(failedFields).toEqual(["email"])
		})

		it("a soft-deleted user keeps its e-mail reserved, as the Prisma unique column does", async () => {
			const deleted = buildUser({
				deletedAt: new Date("2026-02-01T00:00:00.000Z"),
			})
			await repository.save(deleted)

			expect(await repository.userOfEmail(deleted.email)).toBeNull()
			expect(
				await duplicateFieldsOf(
					repository.save(buildUser({ email: deleted.email })),
				),
			).toEqual(["email"])
		})

		it("stores the document with the Prisma column names and the UUID as _id", async () => {
			const user = buildUser({ googleId: `google-${randomUUID()}` })
			await repository.save(user)

			const document = await connection
				.collection<UserDocument>(COLLECTIONS.USERS)
				.findOne({ _id: user.id })

			expect(document).toMatchObject({
				_id: user.id,
				name: "Mongo User",
				email: user.email,
				password_hash: "hashed-password",
				google_id: user.googleId,
				role: "MEMBER",
				status: "activated",
				billing_customer_id: null,
				is_super_admin: false,
				deleted_at: null,
			})
			expect(document?.created_at).toBeInstanceOf(Date)
		})

		it("get ignores UserQuery fields whose value is undefined", async () => {
			const user = buildUser()
			await repository.save(user)

			const found = await repository.get(
				UserQuery.from({ email: user.email })
					.addField("email")
					.addField("name"),
			)

			expect(found?.id).toBe(user.id)
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("withTransaction writes inside the unit of work and rolls back when it fails", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const user = buildUser()

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository.withTransaction(tx).save(user)
					throw new Error("rollback")
				}),
			).rejects.toThrow("rollback")

			expect(await repository.userOfId(user.id)).toBeNull()
		})
	})
})
