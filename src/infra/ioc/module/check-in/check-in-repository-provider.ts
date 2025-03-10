import type { interfaces } from 'inversify'

import type { CheckInRepository } from '@/application/check-in/repository/check-in-repository'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { PrismaCheckInRepository } from '@/infra/database/repository/prisma/prisma-check-in-repository'
import { env } from '@/infra/env'

export class CheckInRepositoryProvider {
  public static provide(context: interfaces.Context): CheckInRepository {
    return env.USE_PRISMA
      ? context.container.get(PrismaCheckInRepository)
      : context.container.get(InMemoryCheckInRepository)
  }
}
