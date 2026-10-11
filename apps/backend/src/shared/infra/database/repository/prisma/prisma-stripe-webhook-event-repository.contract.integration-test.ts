import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeStripeWebhookEventRepositoryContract } from "test/repository-contract/stripe-webhook-event-repository-contract"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaStripeWebhookEventRepository } from "./prisma-stripe-webhook-event-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeStripeWebhookEventRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new PrismaStripeWebhookEventRepository(prismaClient),
		newId: () => recorder.newId(),
		cleanup: async () => {
			await prismaClient.stripeWebhookEvent.deleteMany({
				where: { event_id: { in: [...recorder.ids] } },
			})
		},
	}
})
