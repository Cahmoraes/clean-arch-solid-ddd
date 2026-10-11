import type { ResolutionContext } from "inversify"
import type { AnalyticsCheckInRepository } from "@/analytics/application/repository/analytics-check-in-repository"
import { InMemoryAnalyticsCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-check-in-repository"
import { MongoAnalyticsCheckInRepository } from "@/shared/infra/database/repository/mongo/mongo-analytics-check-in-repository"
import { PrismaAnalyticsCheckInRepository } from "@/shared/infra/database/repository/prisma/prisma-analytics-check-in-repository"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"

export class AnalyticsCheckInRepositoryProvider {
	public static provide(
		context: ResolutionContext,
	): AnalyticsCheckInRepository {
		if (isMongoEnabled()) {
			return context.get(MongoAnalyticsCheckInRepository, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaAnalyticsCheckInRepository, { autobind: true })
			: context.get(InMemoryAnalyticsCheckInRepository, { autobind: true })
	}
}
