import { IdRecorder } from "test/repository-contract/id-recorder"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { describeSubscriptionRepositoryContract } from "test/repository-contract/subscription-repository-contract"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaSubscriptionRepository } from "./prisma-subscription-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeSubscriptionRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)
	return {
		repository: new PrismaSubscriptionRepository(prismaClient),
		newId: () => recorder.newId(),
		ensureReferences: ({ userIds }) => seeder.ensureUsers(userIds),
		cleanup: () => seeder.cleanup(),
	}
})
