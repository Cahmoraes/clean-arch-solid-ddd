import type { interfaces } from 'inversify'

import { UserDAOMemory } from '@/infra/database/dao/in-memory/user-dao-memory'
import { PrismaUserDAO } from '@/infra/database/dao/prisma/prisma-user-dao'
import { env } from '@/infra/env'

export class UserDAOProvider {
  public static provide(context: interfaces.Context) {
    return env.USE_PRISMA
      ? context.container.get(PrismaUserDAO)
      : context.container.get(UserDAOMemory)
  }
}
