import { describeActiveRecipientsProviderContract } from "test/repository-contract/active-recipients-provider-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaActiveRecipientsProvider } from "./prisma-active-recipients.provider"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeActiveRecipientsProviderContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		provider: new PrismaActiveRecipientsProvider(prismaClient),
		newId: () => recorder.newId(),
		seed: async (users) => {
			await prismaClient.user.createMany({
				data: users.map((user) => ({
					id: user.id,
					name: "Recipient",
					email: `${user.id}@recipient.test`,
					role: user.role,
					status: user.status,
					deleted_at: user.deleted
						? new Date("2026-04-01T00:00:00.000Z")
						: null,
				})),
			})
		},
		cleanup: async () => {
			await prismaClient.user.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
