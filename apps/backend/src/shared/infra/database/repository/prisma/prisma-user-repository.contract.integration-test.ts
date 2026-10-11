import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserRepositoryContract } from "test/repository-contract/user-repository-contract"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaUserRepository } from "./prisma-user-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeUserRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new PrismaUserRepository(prismaClient),
		newId: () => recorder.newId(),
		cleanup: async () => {
			await prismaClient.user.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
