import type { ResolutionContext } from "inversify"
import { InMemoryUserActivityRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-activity-repository"
import { MongoUserActivityRepository } from "@/shared/infra/database/repository/mongo/mongo-user-activity-repository"
import { PrismaUserActivityRepository } from "@/shared/infra/database/repository/prisma/prisma-user-activity-repository"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"
import type { UserActivityRepository } from "@/user/application/persistence/repository/user-activity-repository"

export class UserActivityRepositoryProvider {
	public static provide(context: ResolutionContext): UserActivityRepository {
		if (isMongoEnabled()) {
			return context.get(MongoUserActivityRepository, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaUserActivityRepository, { autobind: true })
			: context.get(InMemoryUserActivityRepository, { autobind: true })
	}
}
