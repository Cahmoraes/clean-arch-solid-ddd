import type { interfaces } from 'inversify'

import type { GymRepository } from '@/application/repository/gym-repository'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { PrismaGymRepository } from '@/infra/database/repository/prisma/prisma-gym-repository'
import { env } from '@/shared/env'

export class GymRepositoryProvider {
  public static provide = (context: interfaces.Context) => {
    this.bind(context)
    return env.USE_PRISMA
      ? context.container.get(PrismaGymRepository)
      : context.container.get(InMemoryGymRepository)
  }

  private static bind(context: interfaces.Context) {
    context.container.bind<GymRepository>(PrismaGymRepository).toSelf()
    context.container.bind<GymRepository>(InMemoryGymRepository).toSelf()
  }
}
