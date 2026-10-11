import { randomUUID } from "node:crypto"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { describeCheckInRepositoryContract } from "test/repository-contract/check-in-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { pinTimeZone } from "test/repository-contract/pin-time-zone"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { DuplicateCheckInError } from "@/check-in/application/error/duplicate-check-in-error.js"
import { CheckIn } from "@/check-in/domain/check-in"
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
import { MongoCheckInRepository } from "./mongo-check-in-repository"

type StringIdDocument = { _id: string; [field: string]: unknown }
type CheckInProps = Parameters<typeof CheckIn.restore>[0]

describe("MongoCheckInRepository", () => {
	let connection: MongoConnection
	let repository: MongoCheckInRepository
	const recorder = new IdRecorder()

	function buildCheckIn(
		userId: string,
		overrides: Partial<CheckInProps> = {},
	): CheckIn {
		return CheckIn.restore({
			id: recorder.newId(),
			gymId: recorder.newId(),
			userId,
			createdAt: new Date("2026-05-10T15:00:00.000Z"),
			userLatitude: -23.5505,
			userLongitude: -46.6333,
			...overrides,
		})
	}

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{
				collection: COLLECTIONS.CHECK_INS,
				fields: ["_id", "user_id", "gym_id"],
			},
			{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
		])
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoCheckInRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeCheckInRepositoryContract(
		"mongo",
		async () => {
			const contractRecorder = new IdRecorder()
			return {
				repository: new MongoCheckInRepository(connection),
				newId: () => contractRecorder.newId(),
				ensureReferences: async () => {},
				cleanup: () =>
					deleteDocumentsReferencing(connection, contractRecorder.ids, [
						{
							collection: COLLECTIONS.CHECK_INS,
							fields: ["_id", "user_id", "gym_id"],
						},
					]),
			}
		},
		{ enforcesDailyUniqueness: true },
	)

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-01: the unique index rejects a second check-in of the same user on the same UTC day", async () => {
			const userId = recorder.newId()
			const checkIns = connection.collection<StringIdDocument>(
				COLLECTIONS.CHECK_INS,
			)
			await checkIns.insertOne({
				_id: recorder.newId(),
				user_id: userId,
				dayKey: "2026-05-10",
			})

			const error = await checkIns
				.insertOne({
					_id: recorder.newId(),
					user_id: userId,
					dayKey: "2026-05-10",
				})
				.then(
					() => undefined,
					(caught: unknown) => caught,
				)

			expect(isDuplicateKeyError(error)).toBe(true)
			if (!isDuplicateKeyError(error)) return
			expect(duplicateKeyFields(error)).toEqual(["user_id", "dayKey"])
		})

		it("INV-01: another user on the same day and the same user on another day are accepted", async () => {
			const userId = recorder.newId()
			await repository.save(buildCheckIn(userId))

			await expect(
				repository.save(buildCheckIn(recorder.newId())),
			).resolves.toBeDefined()
			await expect(
				repository.save(
					buildCheckIn(userId, {
						createdAt: new Date("2026-05-11T15:00:00.000Z"),
					}),
				),
			).resolves.toBeDefined()
		})

		it("AC-02: a second check-in of the same user on the same day fails with DuplicateCheckInError", async () => {
			const userId = recorder.newId()
			await repository.save(buildCheckIn(userId))

			await expect(
				repository.save(
					buildCheckIn(userId, {
						createdAt: new Date("2026-05-10T20:00:00.000Z"),
					}),
				),
			).rejects.toBeInstanceOf(DuplicateCheckInError)
		})

		it("rethrows, untranslated, a duplicate key error on a field other than dayKey", async () => {
			const checkIns = connection.collection<StringIdDocument>(
				COLLECTIONS.CHECK_INS,
			)
			const indexName = "check_ins_gym_id_test_unique"
			const gymId = recorder.newId()
			await checkIns.createIndex(
				{ gym_id: 1 },
				{ name: indexName, unique: true },
			)
			try {
				await repository.save(buildCheckIn(recorder.newId(), { gymId }))

				const error = await repository
					.save(buildCheckIn(recorder.newId(), { gymId }))
					.catch((caught: unknown) => caught)

				expect(error).not.toBeInstanceOf(DuplicateCheckInError)
				expect(isDuplicateKeyError(error)).toBe(true)
				if (!isDuplicateKeyError(error)) return
				expect(duplicateKeyFields(error)).toEqual(["gym_id"])
			} finally {
				await checkIns.dropIndex(indexName)
			}
		})

		it("stores dayKey as the UTC date of created_at", async () => {
			const userId = recorder.newId()
			const checkIn = buildCheckIn(userId, {
				createdAt: new Date("2026-03-11T02:30:00.000Z"),
			})
			await repository.save(checkIn)

			const document = await connection
				.collection<StringIdDocument>(COLLECTIONS.CHECK_INS)
				.findOne({ _id: checkIn.id })

			expect(document).toMatchObject({
				_id: checkIn.id,
				user_id: userId,
				dayKey: "2026-03-11",
				validated_at: null,
				rejected_at: null,
			})
		})

		it("saving an existing id only moves validated_at and rejected_at", async () => {
			const userId = recorder.newId()
			const original = buildCheckIn(userId)
			await repository.save(original)

			await repository.save(
				buildCheckIn(userId, {
					id: original.id,
					gymId: original.gymId,
					createdAt: new Date("2026-05-10T18:00:00.000Z"),
					userLatitude: 10,
					validatedAt: new Date("2026-05-10T15:10:00.000Z"),
				}),
			)

			const found = await repository.checkOfById(original.id)
			expect(found?.createdAt.toISOString()).toBe("2026-05-10T15:00:00.000Z")
			expect(found?.latitude).toBeCloseTo(-23.5505, 6)
			expect(found?.validatedAt?.toISOString()).toBe("2026-05-10T15:10:00.000Z")
		})

		it("findMany filters by gym name, case-insensitively", async () => {
			const userId = recorder.newId()
			const gymId = recorder.newId()
			const otherGymId = recorder.newId()
			const token = randomUUID().slice(0, 8)
			await connection
				.collection<StringIdDocument>(COLLECTIONS.GYMS)
				.insertMany([
					{ _id: gymId, cnpj: gymId, title: `${token} Central` },
					{ _id: otherGymId, cnpj: otherGymId, title: "Unrelated Gym" },
				])
			const matching = buildCheckIn(userId, { gymId })
			const other = buildCheckIn(userId, {
				gymId: otherGymId,
				createdAt: new Date("2026-05-11T15:00:00.000Z"),
			})
			await repository.save(matching)
			await repository.save(other)

			const output = await repository.findMany({
				page: 1,
				userId,
				gymName: token.toUpperCase(),
			})

			expect(output.total).toBe(1)
			expect(output.items.map((item) => item.id)).toEqual([matching.id])
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("withTransaction writes inside the unit of work and rolls back when it fails", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const checkIn = buildCheckIn(recorder.newId())

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository.withTransaction(tx).save(checkIn)
					throw new Error("rollback")
				}),
			).rejects.toThrow("rollback")

			expect(await repository.checkOfById(checkIn.id)).toBeNull()
		})
	})

	describe("near midnight, local day differs from UTC day", () => {
		let restoreTimeZone: () => void

		beforeAll(() => {
			restoreTimeZone = pinTimeZone("America/Sao_Paulo")
		})

		afterAll(() => {
			restoreTimeZone()
		})

		afterEach(cleanup)

		it("Review Focus: same UTC day but another local day: onSameDateOfUserId is false and the unique index still refuses the second check-in, as Prisma does", async () => {
			const userId = recorder.newId()
			// 23:30 on March 10th local (02:30Z on the 11th) and 00:30 on March 11th local (03:30Z on the 11th).
			const lateEvening = new Date("2026-03-11T02:30:00.000Z")
			const afterMidnight = new Date("2026-03-11T03:30:00.000Z")
			await repository.save(buildCheckIn(userId, { createdAt: lateEvening }))

			expect(await repository.onSameDateOfUserId(userId, afterMidnight)).toBe(
				false,
			)
			await expect(
				repository.save(buildCheckIn(userId, { createdAt: afterMidnight })),
			).rejects.toBeInstanceOf(DuplicateCheckInError)
		})

		it("Review Focus: same local day but another UTC day: onSameDateOfUserId is true and the unique index does not block the second check-in", async () => {
			const userId = recorder.newId()
			// 20:30 on March 11th local (23:30Z) and 21:30 on March 11th local (00:30Z on the 12th).
			const evening = new Date("2026-03-11T23:30:00.000Z")
			const laterEvening = new Date("2026-03-12T00:30:00.000Z")
			await repository.save(buildCheckIn(userId, { createdAt: evening }))

			expect(await repository.onSameDateOfUserId(userId, laterEvening)).toBe(
				true,
			)
			await expect(
				repository.save(buildCheckIn(userId, { createdAt: laterEvening })),
			).resolves.toBeDefined()
		})
	})
})
