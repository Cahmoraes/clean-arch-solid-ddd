import type { ResolutionContext } from "inversify"

import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository.js"
import { PrismaUserRepository } from "@/shared/infra/database/repository/prisma/prisma-user-repository"
import { SQLiteUserRepository } from "@/shared/infra/database/repository/sqlite/sqlite-user-repository"
import { env, isProduction } from "@/shared/infra/env"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"

export class UserRepositoryProvider {
	public static provide(context: ResolutionContext): UserRepository {
		return isProduction()
			? context.get(UserRepositoryProvider.selectDatabaseByProvider(), {
					autobind: true,
				})
			: context.get(InMemoryUserRepository, { autobind: true })
	}

	private static selectDatabaseByProvider() {
		switch (env.DATABASE_PROVIDER) {
			case "prisma":
				return PrismaUserRepository
			default:
				return SQLiteUserRepository
		}
	}
}
