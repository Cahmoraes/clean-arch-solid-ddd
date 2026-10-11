import type { ResolutionContext } from "inversify"
import { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { MongoSubscriptionRepository } from "@/shared/infra/database/repository/mongo/mongo-subscription-repository"
import { PrismaSubscriptionRepository } from "@/shared/infra/database/repository/prisma/prisma-subscription-repository"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"

export class SubscriptionRepositoryProvider {
	public static provide(context: ResolutionContext): SubscriptionRepository {
		if (isMongoEnabled()) {
			return context.get(MongoSubscriptionRepository, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaSubscriptionRepository, { autobind: true })
			: context.get(InMemorySubscriptionRepository, { autobind: true })
	}
}
