import type { ResolutionContext } from 'inversify'

import type { CheckInRepository } from '@/check-in/application/repository/check-in-repository'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { PrismaCheckInRepository } from '@/infra/database/repository/prisma/prisma-check-in-repository'
import { isProduction } from '@/infra/env'

export class CheckInRepositoryProvider {
  public static provide(context: ResolutionContext): CheckInRepository {
    return isProduction()
      ? context.get(PrismaCheckInRepository, { autobind: true })
      : context.get(InMemoryCheckInRepository, { autobind: true })
  }
}
