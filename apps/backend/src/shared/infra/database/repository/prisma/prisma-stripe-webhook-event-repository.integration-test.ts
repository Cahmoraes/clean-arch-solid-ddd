import { randomUUID } from "node:crypto"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"
import { PrismaStripeWebhookEventRepository } from "@/shared/infra/database/repository/prisma/prisma-stripe-webhook-event-repository"
import { DuplicateWebhookEventError } from "@/subscription/application/error/duplicate-webhook-event-error"

describe("PrismaStripeWebhookEventRepository", () => {
	let sut: PrismaStripeWebhookEventRepository
	const processedEventIds: string[] = []

	beforeEach(() => {
		sut = new PrismaStripeWebhookEventRepository(prismaClient)
	})

	afterEach(async () => {
		if (processedEventIds.length > 0) {
			await prismaClient.stripeWebhookEvent.deleteMany({
				where: { event_id: { in: processedEventIds } },
			})
			processedEventIds.length = 0
		}
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	it("deve marcar evento como processado com sucesso", async () => {
		const eventId = `evt_${randomUUID()}`
		processedEventIds.push(eventId)

		await expect(
			sut.markAsProcessed(eventId, "customer.subscription.updated"),
		).resolves.not.toThrow()
	})

	it("deve lançar DuplicateWebhookEventError na segunda inserção com mesmo eventId", async () => {
		const eventId = `evt_${randomUUID()}`
		processedEventIds.push(eventId)

		await sut.markAsProcessed(eventId, "customer.subscription.updated")

		await expect(
			sut.markAsProcessed(eventId, "customer.subscription.updated"),
		).rejects.toThrow(DuplicateWebhookEventError)
	})

	it("deve persistir o evento com eventType correto", async () => {
		const eventId = `evt_${randomUUID()}`
		const eventType = "invoice.payment_failed"
		processedEventIds.push(eventId)

		await sut.markAsProcessed(eventId, eventType)

		const record = await prismaClient.stripeWebhookEvent.findUnique({
			where: { event_id: eventId },
		})
		expect(record?.event_type).toBe(eventType)
	})

	it("deve relançar erros que não sejam violação de unique constraint", async () => {
		const invalidSut = new PrismaStripeWebhookEventRepository(
			{} as typeof prismaClient,
		)

		await expect(
			invalidSut.markAsProcessed("evt_any", "customer.subscription.updated"),
		).rejects.not.toBeInstanceOf(DuplicateWebhookEventError)
	})
})
