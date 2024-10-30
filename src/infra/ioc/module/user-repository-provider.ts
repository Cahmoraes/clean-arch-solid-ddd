import type { interfaces } from 'inversify'

import { InMemoryUserRepository } from '@/infra/database/repository/in-memory-repository'
import { PrismaUserRepository } from '@/infra/database/repository/prisma-user-repository'
import { env } from '@/infra/env'

export class UserRepositoryProvider {
  static provide(context: interfaces.Context) {
    return env.USE_PRISMA
      ? context.container.get(PrismaUserRepository)
      : context.container.get(InMemoryUserRepository)
  }
}
