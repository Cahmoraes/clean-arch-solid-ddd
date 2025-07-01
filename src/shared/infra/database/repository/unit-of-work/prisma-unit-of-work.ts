import type { PrismaClient } from '@prisma/client'
import type { ITXClientDenyList } from '@prisma/client/runtime/library'
import { inject, injectable } from 'inversify'

import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'

import type { UnitOfWork } from './unit-of-work'

type Callback = (
  prismaClient: Omit<PrismaClient, ITXClientDenyList>,
) => Promise<any>

@injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    @inject(SHARED_TYPES.Prisma.Client) private readonly prismaClient: PrismaClient,
  ) {}

  public async performTransaction<T extends Callback>(
    callback: T,
  ): Promise<ReturnType<T>> {
    return this.prismaClient.$transaction(async (tx) => {
      return callback(tx)
    })
  }
}
