import { describeGymRepositoryContract } from "test/repository-contract/gym-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaGymRepository } from "./prisma-gym-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeGymRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new PrismaGymRepository(prismaClient),
		newId: () => recorder.newId(),
		cleanup: async () => {
			await prismaClient.gym.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
