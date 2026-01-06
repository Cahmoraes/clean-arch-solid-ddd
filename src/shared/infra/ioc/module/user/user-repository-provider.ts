import type { ResolutionContext } from "inversify"

import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository.js"
import { PrismaUserRepository } from "@/shared/infra/database/repository/prisma/prisma-user-repository"
import { isProduction } from "@/shared/infra/env"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"

export class UserRepositoryProvider {
	public static provide(context: ResolutionContext): UserRepository {
		return isProduction()
			? context.get(PrismaUserRepository, { autobind: true })
			: context.get(InMemoryUserRepository, { autobind: true })
	}
}
