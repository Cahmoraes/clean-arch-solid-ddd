import { IdRecorder } from "test/repository-contract/id-recorder"
import { describePlanRepositoryContract } from "test/repository-contract/plan-repository-contract"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { Prisma } from "@/shared/infra/database/generated/prisma/client"
import { PrismaPlanRepository } from "./prisma-plan-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describePlanRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new PrismaPlanRepository(prismaClient),
		newId: () => recorder.newId(),
		missingRecordError: Prisma.PrismaClientKnownRequestError,
		cleanup: async () => {
			await prismaClient.plan.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
