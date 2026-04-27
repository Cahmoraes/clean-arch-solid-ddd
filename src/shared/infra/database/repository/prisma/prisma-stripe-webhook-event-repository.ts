import { inject, injectable } from "inversify"
import {
	Prisma,
	type PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { PrismaUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { DuplicateWebhookEventError } from "@/subscription/application/error/duplicate-webhook-event-error"
import type { StripeWebhookEventRepository } from "@/subscription/repository/stripe-webhook-event-repository"

@injectable()
export class PrismaStripeWebhookEventRepository
	implements StripeWebhookEventRepository
{
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(
		prismaClient: TX,
	): StripeWebhookEventRepository {
		if (!PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			throw new InvalidTransactionInstance(prismaClient)
		}
		return new PrismaStripeWebhookEventRepository(prismaClient)
	}

	public async markAsProcessed(
		eventId: string,
		eventType: string,
	): Promise<void> {
		try {
			await this.prisma.stripeWebhookEvent.create({
				data: {
					event_id: eventId,
					event_type: eventType,
				},
			})
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new DuplicateWebhookEventError(eventId)
			}
			throw error
		}
	}
}
