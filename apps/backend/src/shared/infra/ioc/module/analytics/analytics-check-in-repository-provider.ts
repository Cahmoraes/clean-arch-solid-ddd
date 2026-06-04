import type { ResolutionContext } from "inversify"
import type { AnalyticsCheckInRepository } from "@/analytics/application/repository/analytics-check-in-repository"
import { InMemoryAnalyticsCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-check-in-repository"
import { PrismaAnalyticsCheckInRepository } from "@/shared/infra/database/repository/prisma/prisma-analytics-check-in-repository"
import { isProduction } from "@/shared/infra/env"

export class AnalyticsCheckInRepositoryProvider {
	public static provide(
		context: ResolutionContext,
	): AnalyticsCheckInRepository {
		return isProduction()
			? context.get(PrismaAnalyticsCheckInRepository, { autobind: true })
			: context.get(InMemoryAnalyticsCheckInRepository, { autobind: true })
	}
}
