import { inject, injectable } from "inversify"
import type {
	Prisma,
	PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"

import { SHARED_TYPES } from "@/shared/infra/ioc/types"

import type { Callback, UnitOfWork } from "./unit-of-work"

type ValidPrismaClient = PrismaClient | Prisma.TransactionClient

@injectable()
export class PrismaUnitOfWork implements UnitOfWork {
	public static readonly PRISMA_TRANSACTION_SYMBOL =
		Symbol("PRISMA_TRANSACTION")

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
			[PrismaUnitOfWork.PRISMA_TRANSACTION_SYMBOL]: true,
		})
	}
}

export function isPrismaTransaction(obj: any): obj is ValidPrismaClient {
	return (
		Reflect.has(obj, PrismaUnitOfWork.PRISMA_TRANSACTION_SYMBOL) &&
		Boolean(obj[PrismaUnitOfWork.PRISMA_TRANSACTION_SYMBOL])
	)
}
