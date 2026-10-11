import { IdRecorder } from "test/repository-contract/id-recorder"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { describeUserActivityDaoContract } from "test/repository-contract/user-activity-dao-contract"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaUserActivityDao } from "./prisma-user-activity-dao"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeUserActivityDaoContract("prisma", async () => {
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)
	return {
		newId: () => recorder.newId(),
		seed: async (data) => {
			await seeder.ensureUsers([data.userId])
			await seeder.ensureGyms([data.gymId])
			await prismaClient.gym.update({
				where: { id: data.gymId },
				data: { title: data.gymTitle },
			})
			await prismaClient.userActivityEvent.createMany({
				data: data.events.map((event) => ({
					id: event.id,
					userId: data.userId,
					type: event.type,
					description: event.description,
					occurredAt: event.occurredAt,
				})),
			})
			await prismaClient.checkIn.createMany({
				data: data.checkIns.map((checkIn) => ({
					id: checkIn.id,
					user_id: data.userId,
					gym_id: data.gymId,
					created_at: checkIn.occurredAt,
					latitude: -23.5505,
					longitude: -46.6333,
				})),
			})
			return new PrismaUserActivityDao(prismaClient)
		},
		cleanup: () => seeder.cleanup(),
	}
})
