import type { ResolutionContext } from 'inversify'

import type { GymRepository } from '@/gym/application/repository/gym-repository'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { PrismaGymRepository } from '@/infra/database/repository/prisma/prisma-gym-repository'
import { isProduction } from '@/infra/env'

export class GymRepositoryProvider {
  public static provide(context: ResolutionContext): GymRepository {
    return isProduction()
      ? context.get(PrismaGymRepository, { autobind: true })
      : context.get(InMemoryGymRepository, { autobind: true })
  }
}
