import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { randomCnpj } from "test/repository-contract/gym-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Gym } from "@/gym/domain/gym"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaGymRepository } from "@/shared/infra/database/repository/prisma/prisma-gym-repository"
import { MongoGymRepository } from "./mongo-gym-repository"

// Center in the open ocean so rows already present in the development databases do not interfere.
const CENTER = Coordinate.restore({ latitude: 0.5, longitude: -30.5 })

describe("gym nearby search parity (Prisma x Mongo)", () => {
	let connection: MongoConnection
	let prismaRepository: PrismaGymRepository
	let mongoRepository: MongoGymRepository
	const recorder = new IdRecorder()
	let nearId: string
	let nearInactiveId: string
	let farId: string

	function buildGym(
		id: string,
		latitude: number,
		longitude: number,
		status: "activated" | "deactivated",
	): Gym {
		return Gym.restore({
			id,
			title: `Parity ${id.slice(0, 8)}`,
			description: "parity",
			phone: "+5511999999999",
			address: "Rua Paridade, 1",
			latitude,
			longitude,
			cnpj: randomCnpj(),
			status,
			operatingHours: null,
		})
	}

	async function nearbyIds(
		repository: PrismaGymRepository | MongoGymRepository,
		options?: { includeInactive?: boolean },
	): Promise<string[]> {
		const ours = new Set([nearId, nearInactiveId, farId])
		const gyms = await repository.fetchNearbyCoord(CENTER, options)
		return gyms
			.map((gym) => gym.id)
			.filter((id) => ours.has(id))
			.sort()
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		prismaRepository = new PrismaGymRepository(prismaClient)
		mongoRepository = new MongoGymRepository(connection)
		nearId = recorder.newId()
		nearInactiveId = recorder.newId()
		farId = recorder.newId()
		// ~1.5 km, ~1.6 km (deactivated) and ~11.1 km from the center.
		const gyms = [
			buildGym(nearId, 0.5135, -30.5, "activated"),
			buildGym(nearInactiveId, 0.5, -30.5145, "deactivated"),
			buildGym(farId, 0.6, -30.5, "activated"),
		]
		for (const gym of gyms) {
			await prismaRepository.save(gym)
			await mongoRepository.save(gym)
		}
	})

	afterAll(async () => {
		await prismaClient.gym.deleteMany({
			where: { id: { in: [...recorder.ids] } },
		})
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
		])
		await prismaClient.$disconnect()
		await connection.disconnect()
	})

	it("AC-08: the default search returns the same gyms in both adapters, inactive ones included", async () => {
		const fromPrisma = await nearbyIds(prismaRepository)
		const fromMongo = await nearbyIds(mongoRepository)

		expect(fromMongo).toEqual(fromPrisma)
		expect(fromMongo).toEqual([nearId, nearInactiveId].sort())
	})

	it("AC-08: includeInactive false returns the same active gyms in both adapters", async () => {
		const fromPrisma = await nearbyIds(prismaRepository, {
			includeInactive: false,
		})
		const fromMongo = await nearbyIds(mongoRepository, {
			includeInactive: false,
		})

		expect(fromMongo).toEqual(fromPrisma)
		expect(fromMongo).toEqual([nearId])
	})

	it("AC-08: includeInactive true returns the same gyms as the default in both adapters", async () => {
		const fromPrisma = await nearbyIds(prismaRepository, {
			includeInactive: true,
		})
		const fromMongo = await nearbyIds(mongoRepository, {
			includeInactive: true,
		})

		expect(fromMongo).toEqual(fromPrisma)
		expect(fromMongo).toEqual([nearId, nearInactiveId].sort())
	})
})
