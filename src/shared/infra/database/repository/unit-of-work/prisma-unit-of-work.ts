import type { PrismaClient } from '@prisma/client'
import type { ITXClientDenyList } from '@prisma/client/runtime/library'
import { inject, injectable } from 'inversify'

import { SHARED_TYPES } from '@/shared/infra/ioc/types'

import type { Callback, UnitOfWork } from './unit-of-work'

type ValidPrismaClient = PrismaClient | Omit<PrismaClient, ITXClientDenyList>

export const PRISMA_TRANSACTION_SYMBOL = Symbol('PRISMA_TRANSACTION')

@injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    @inject(SHARED_TYPES.Prisma.Client)
    private readonly prismaClient: PrismaClient,
  ) {}

  public async performTransaction<T>(callback: Callback<T>): Promise<T> {
    return this.prismaClient.$transaction(async (tx) => {
      return callback(this.createTransactionWithSymbol(tx))
    })
  }

  private createTransactionWithSymbol(tx: unknown) {
    return Object.assign({}, tx, {
      [PRISMA_TRANSACTION_SYMBOL]: true,
    })
  }
}

export function isPrismaTransaction(obj: any): obj is ValidPrismaClient {
  return (
    Reflect.has(obj, PRISMA_TRANSACTION_SYMBOL) &&
    Boolean(obj[PRISMA_TRANSACTION_SYMBOL])
  )
}
