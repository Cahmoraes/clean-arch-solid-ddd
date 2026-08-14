import type { ResolutionContext } from "inversify"
import { InMemoryUserActivityDao } from "@/shared/infra/database/dao/in-memory/user-activity-dao-memory"
import { PrismaUserActivityDao } from "@/shared/infra/database/dao/prisma/prisma-user-activity-dao"
import { isProduction } from "@/shared/infra/env"
import type { UserActivityDao } from "@/user/application/persistence/dao/user-activity-dao"

export class UserActivityDaoProvider {
	public static provide(context: ResolutionContext): UserActivityDao {
		return isProduction()
			? context.get(PrismaUserActivityDao, { autobind: true })
			: context.get(InMemoryUserActivityDao, { autobind: true })
	}
}
