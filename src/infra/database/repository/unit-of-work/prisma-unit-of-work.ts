import type { PrismaClient } from '@prisma/client'
import type { ITXClientDenyList } from '@prisma/client/runtime/library'
import { inject, injectable } from 'inversify'

import { TYPES } from '@/infra/ioc/types'

type Callback = (
  prismaClient: Omit<PrismaClient, ITXClientDenyList>,
) => Promise<any>

@injectable()
export class PrismaUnitOfWork {
  constructor(
    @inject(TYPES.Prisma.Client) private readonly prismaClient: PrismaClient,
  ) {}

  public async performTransaction<T extends Callback>(
    callback: T,
  ): Promise<ReturnType<T>> {
    return this.prismaClient.$transaction(async (tx) => {
      return callback(tx)
    })
  }
}
