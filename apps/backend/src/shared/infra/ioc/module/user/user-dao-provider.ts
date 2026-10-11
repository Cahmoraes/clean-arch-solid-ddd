import type { ResolutionContext } from "inversify"
import { UserDAOMemory } from "@/shared/infra/database/dao/in-memory/user-dao-memory"
import { MongoUserDao } from "@/shared/infra/database/dao/mongo/mongo-user-dao"
import { PrismaUserDAO } from "@/shared/infra/database/dao/prisma/prisma-user-dao"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"
import type { UserDAO } from "@/user/application/persistence/dao/user-dao"

export class UserDAOProvider {
	public static provide(context: ResolutionContext): UserDAO {
		if (isMongoEnabled()) {
			return context.get(MongoUserDao, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaUserDAO, { autobind: true })
			: context.get(UserDAOMemory, { autobind: true })
	}
}
