import type { ResolutionContext } from "inversify"
import { InMemoryUserActivityDao } from "@/shared/infra/database/dao/in-memory/user-activity-dao-memory"
import { MongoUserActivityDao } from "@/shared/infra/database/dao/mongo/mongo-user-activity-dao"
import { PrismaUserActivityDao } from "@/shared/infra/database/dao/prisma/prisma-user-activity-dao"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"
import type { UserActivityDao } from "@/user/application/persistence/dao/user-activity-dao"

export class UserActivityDaoProvider {
	public static provide(context: ResolutionContext): UserActivityDao {
		if (isMongoEnabled()) {
			return context.get(MongoUserActivityDao, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaUserActivityDao, { autobind: true })
			: context.get(InMemoryUserActivityDao, { autobind: true })
	}
}
