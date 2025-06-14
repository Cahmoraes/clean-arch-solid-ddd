import type { ResolutionContext } from 'inversify'

import { isProduction } from '@/infra/env'

import { PrismaUnitOfWork } from './prisma-unit-of-work'
import { TestingUnitOfWork } from './testing-unit-of-work'
import type { UnitOfWork } from './unit-of-work'

export class UnitOfWorkProvider {
  public static provide(context: ResolutionContext): UnitOfWork {
    return isProduction()
      ? context.get(PrismaUnitOfWork)
      : context.get(TestingUnitOfWork)
  }
}
