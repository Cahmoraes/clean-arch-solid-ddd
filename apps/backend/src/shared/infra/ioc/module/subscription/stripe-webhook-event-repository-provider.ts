import type { ResolutionContext } from "inversify"

import { InMemoryStripeWebhookEventRepository } from "@/shared/infra/database/repository/in-memory/in-memory-stripe-webhook-event-repository"
import { PrismaStripeWebhookEventRepository } from "@/shared/infra/database/repository/prisma/prisma-stripe-webhook-event-repository"
import { isProduction } from "@/shared/infra/env"
import type { StripeWebhookEventRepository } from "@/subscription/repository/stripe-webhook-event-repository"

export class StripeWebhookEventRepositoryProvider {
	public static provide(
		context: ResolutionContext,
	): StripeWebhookEventRepository {
		return isProduction()
			? context.get(PrismaStripeWebhookEventRepository, { autobind: true })
			: context.get(InMemoryStripeWebhookEventRepository, { autobind: true })
	}
}
