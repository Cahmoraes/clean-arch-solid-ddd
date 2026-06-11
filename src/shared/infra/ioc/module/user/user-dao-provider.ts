import type { ResolutionContext } from "inversify"

import { UserDAOMemory } from "@/shared/infra/database/dao/in-memory/user-dao-memory"
import { PrismaUserDAO } from "@/shared/infra/database/dao/prisma/prisma-user-dao"
import { isProduction } from "@/shared/infra/env"
import type { UserDAO } from "@/user/application/persistence/dao/user-dao"

export class UserDAOProvider {
	public static provide(context: ResolutionContext): UserDAO {
		return isProduction()
			? context.get(PrismaUserDAO, { autobind: true })
			: context.get(UserDAOMemory, { autobind: true })
	}
}
