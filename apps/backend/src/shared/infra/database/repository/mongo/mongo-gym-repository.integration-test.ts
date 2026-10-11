import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import {
	describeGymRepositoryContract,
	randomCnpj,
} from "test/repository-contract/gym-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { Gym } from "@/gym/domain/gym"
import { OperatingHours } from "@/gym/domain/value-object/spec-gym-dates.js"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
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
import { type GymDocument, MongoGymRepository } from "./mongo-gym-repository"

type GymProps = Parameters<typeof Gym.restore>[0]

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

describe("MongoGymRepository", () => {
	let connection: MongoConnection
	let repository: MongoGymRepository
	const recorder = new IdRecorder()

	function buildGym(overrides: Partial<GymProps> = {}): Gym {
		return Gym.restore({
			id: overrides.id ?? recorder.newId(),
			title: "Mongo Gym",
			description: "Mongo gym",
			phone: "+5511999999999",
			address: "Rua Mongo, 1",
			latitude: -30,
			longitude: -30,
			cnpj: randomCnpj(),
			status: "activated",
			operatingHours: null,
			...overrides,
		})
	}

	function buildOperatingHours(): OperatingHours {
		const result = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "06:00", close: "12:00" }] },
		])
		if (result.isFailure()) throw result.value
		return result.value
	}

	function around(latitude: number, longitude: number): Coordinate {
		return Coordinate.restore({ latitude, longitude })
	}

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
		])
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoGymRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeGymRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoGymRepository(connection),
			newId: () => contractRecorder.newId(),
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-02: the unique index rejects a second gym with the same CNPJ", async () => {
			const cnpj = randomCnpj()
			await repository.save(buildGym({ cnpj }))

			expect(
				await duplicateFieldsOf(repository.save(buildGym({ cnpj }))),
			).toEqual(["cnpj"])
		})

		it("AC-02: a repeated CNPJ is found by the lookup the use case runs first, and the index blocks the second insert", async () => {
			const cnpj = randomCnpj()
			const first = buildGym({ cnpj })
			await repository.save(first)

			const existing = await repository.gymOfCNPJ(cnpj)
			const failedFields = await duplicateFieldsOf(
				repository.save(buildGym({ cnpj })),
			)

			expect(existing?.id).toBe(first.id)
			expect(failedFields).toEqual(["cnpj"])
		})

		it("round-trips the operating hours JSON and a missing value", async () => {
			const withHours = buildGym({ operatingHours: buildOperatingHours() })
			const withoutHours = buildGym({ operatingHours: null })
			await repository.save(withHours)
			await repository.save(withoutHours)

			const foundWith = await repository.gymOfId(withHours.id)
			const foundWithout = await repository.gymOfId(withoutHours.id)

			expect(foundWith?.operatingHours?.toJSON()).toEqual([
				{ weekday: 1, intervals: [{ open: "06:00", close: "12:00" }] },
			])
			expect(foundWithout?.operatingHours).toBeNull()
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("withTransaction writes inside the unit of work and rolls back when it fails", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const gym = buildGym()

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository.withTransaction(tx).save(gym)
					throw new Error("rollback")
				}),
			).rejects.toThrow("rollback")

			expect(await repository.gymOfId(gym.id)).toBeNull()
		})
	})

	describe("location is always derived", () => {
		afterEach(cleanup)

		it("Review Focus: save and update always write location as [longitude, latitude]", async () => {
			const id = recorder.newId()
			const cnpj = randomCnpj()
			await repository.save(
				buildGym({ id, cnpj, latitude: -30, longitude: -31 }),
			)
			const gyms = connection.collection<GymDocument>(COLLECTIONS.GYMS)

			const afterSave = await gyms.findOne({ _id: id })
			expect(afterSave?.location).toEqual({
				type: "Point",
				coordinates: [-31, -30],
			})

			await repository.update(
				buildGym({ id, cnpj, latitude: -40, longitude: -41 }),
			)
			const afterUpdate = await gyms.findOne({ _id: id })
			expect(afterUpdate?.location).toEqual({
				type: "Point",
				coordinates: [-41, -40],
			})
		})

		it("Review Focus: a gym moved by update is found only around its new place", async () => {
			const id = recorder.newId()
			const cnpj = randomCnpj()
			await repository.save(
				buildGym({ id, cnpj, latitude: -30, longitude: -30 }),
			)
			await repository.update(
				buildGym({ id, cnpj, latitude: -30.3, longitude: -30 }),
			)

			const aroundOldPlace = await repository.fetchNearbyCoord(around(-30, -30))
			const aroundNewPlace = await repository.fetchNearbyCoord(
				around(-30.3, -30),
			)

			expect(aroundOldPlace.map((gym) => gym.id)).not.toContain(id)
			expect(aroundNewPlace.map((gym) => gym.id)).toContain(id)
		})
	})
})
