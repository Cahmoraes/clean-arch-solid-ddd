import type { interfaces } from 'inversify'

import type { GymRepository } from '@/application/gym/repository/gym-repository'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { PrismaGymRepository } from '@/infra/database/repository/prisma/prisma-gym-repository'
import { env } from '@/infra/env'

export class GymRepositoryProvider {
  public static provide(context: interfaces.Context): GymRepository {
    return env.USE_PRISMA
      ? context.container.get(PrismaGymRepository)
      : context.container.get(InMemoryGymRepository)
  }
}
