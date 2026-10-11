import type { ResolutionContext } from "inversify"
import type { AnalyticsUserRepository } from "@/analytics/application/repository/analytics-user-repository"
import { InMemoryAnalyticsUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-user-repository"
import { MongoAnalyticsUserRepository } from "@/shared/infra/database/repository/mongo/mongo-analytics-user-repository"
import { PrismaAnalyticsUserRepository } from "@/shared/infra/database/repository/prisma/prisma-analytics-user-repository"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"

export class AnalyticsUserRepositoryProvider {
	public static provide(context: ResolutionContext): AnalyticsUserRepository {
		if (isMongoEnabled()) {
			return context.get(MongoAnalyticsUserRepository, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaAnalyticsUserRepository, { autobind: true })
			: context.get(InMemoryAnalyticsUserRepository, { autobind: true })
	}
}
