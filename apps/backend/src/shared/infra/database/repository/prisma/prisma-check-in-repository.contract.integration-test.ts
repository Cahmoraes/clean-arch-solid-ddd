import { describeCheckInRepositoryContract } from "test/repository-contract/check-in-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { PrismaReferenceSeeder } from "test/repository-contract/prisma-reference-seeder"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaCheckInRepository } from "./prisma-check-in-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeCheckInRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	const seeder = new PrismaReferenceSeeder(prismaClient)
	return {
		repository: new PrismaCheckInRepository(prismaClient),
		newId: () => recorder.newId(),
		ensureReferences: async ({ userIds, gymIds }) => {
			await seeder.ensureUsers(userIds)
			await seeder.ensureGyms(gymIds)
		},
		cleanup: () => seeder.cleanup(),
	}
})
