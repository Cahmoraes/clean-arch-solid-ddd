import type { PrismaClient, PrismaPromise } from '@prisma/client'
import { inject, injectable } from 'inversify'

import { TYPES } from '@/infra/ioc/types'

@injectable()
export class PrismaUnitOfWork {
  constructor(
    @inject(TYPES.Prisma.Client) private readonly prismaClient: PrismaClient,
  ) {}

  public async performTransaction<Operation>(
    operations: PrismaPromise<Operation>[],
  ): Promise<Operation[]> {
    return this.prismaClient.$transaction(operations)
  }
}
