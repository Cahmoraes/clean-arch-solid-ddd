import type { ResolutionContext } from 'inversify'

import type { UserRepository } from '@/application/user/repository/user-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository.js'
import { PrismaUserRepository } from '@/infra/database/repository/prisma/prisma-user-repository'
import { isProduction } from '@/infra/env'

export class UserRepositoryProvider {
  public static provide(context: ResolutionContext): UserRepository {
    return isProduction()
      ? context.get(PrismaUserRepository)
      : context.get(InMemoryUserRepository)
  }
}
