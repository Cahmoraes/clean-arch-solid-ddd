import type { ResolutionContext } from 'inversify'

import type { UserDAO } from '@/application/user/dao/user-dao'
import { UserDAOMemory } from '@/infra/database/dao/in-memory/user-dao-memory'
import { PrismaUserDAO } from '@/infra/database/dao/prisma/prisma-user-dao'
import { env } from '@/infra/env'

export class UserDAOProvider {
  public static provide(context: ResolutionContext): UserDAO {
    return env.USE_PRISMA
      ? context.get(PrismaUserDAO, { autobind: true })
      : context.get(UserDAOMemory, { autobind: true })
  }
}
