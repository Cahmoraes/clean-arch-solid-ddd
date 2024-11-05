import type { interfaces } from 'inversify'

import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository.js'
import { PrismaUserRepository } from '@/infra/database/repository/prisma/prisma-user-repository'
import { env } from '@/shared/env'

export class UserRepositoryProvider {
  static provide(context: interfaces.Context) {
    this.bind(context)
    return env.USE_PRISMA
      ? context.container.get(PrismaUserRepository)
      : context.container.get(InMemoryUserRepository)
  }

  private static bind(context: interfaces.Context) {
    context.container.bind<PrismaUserRepository>(PrismaUserRepository).toSelf()
    context.container
      .bind<InMemoryUserRepository>(InMemoryUserRepository)
      .toSelf()
  }
}
