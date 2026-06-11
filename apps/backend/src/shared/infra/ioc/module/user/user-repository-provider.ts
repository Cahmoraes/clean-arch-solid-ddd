import type { ResolutionContext } from "inversify"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository.js"
import { PrismaUserRepository } from "@/shared/infra/database/repository/prisma/prisma-user-repository"
import { SQLiteUserRepository } from "@/shared/infra/database/repository/sqlite/sqlite-user-repository"
import { env, isProduction } from "@/shared/infra/env"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"

export class UserRepositoryProvider {
	public static provide(context: ResolutionContext): UserRepository {
		if (!isProduction()) {
			return context.get(InMemoryUserRepository, { autobind: true })
		}
		if (env.DATABASE_PROVIDER === "prisma") {
			return context.get(PrismaUserRepository, { autobind: true })
		}
		return context.get(SQLiteUserRepository, { autobind: true })
	}
}
