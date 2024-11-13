import type { interfaces } from 'inversify'

import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { PrismaGymRepository } from '@/infra/database/repository/prisma/prisma-gym-repository'
import { env } from '@/infra/env'

export class GymRepositoryProvider {
  public static provide = (context: interfaces.Context) => {
    return env.USE_PRISMA
      ? context.container.get(PrismaGymRepository)
      : context.container.get(InMemoryGymRepository)
  }
}
