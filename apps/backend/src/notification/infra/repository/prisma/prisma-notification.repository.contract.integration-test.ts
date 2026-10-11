import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeNotificationRepositoryContract } from "test/repository-contract/notification-repository-contract"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaNotificationRepository } from "./prisma-notification.repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeNotificationRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)
	return {
		repository: new PrismaNotificationRepository(prismaClient),
		newId: () => recorder.newId(),
		ensureReferences: ({ userIds }) => seeder.ensureUsers(userIds),
		cleanup: () => seeder.cleanup(),
	}
})
