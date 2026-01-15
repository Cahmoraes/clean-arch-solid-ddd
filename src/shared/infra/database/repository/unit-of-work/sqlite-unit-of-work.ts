import { inject, injectable } from "inversify"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { SQLiteConnection } from "../../connection/sqlite-connection"
import type { Callback, UnitOfWork } from "./unit-of-work"

@injectable()
export class SQLiteUnitOfWork implements UnitOfWork {
	public static readonly SQLITE_TRANSACTION_SYMBOL =
		Symbol("SQLITE_TRANSACTION")

	constructor(
		@inject(SHARED_TYPES.SQLite.Client)
		private readonly sqliteConnection: SQLiteConnection,
	) {}

	public runTransaction<T>(callback: Callback<T>) {
		const result = this.sqliteConnection.transaction((tx) => {
			return callback(this.createTransactionWithSymbol(tx))
		})
		return Promise.resolve(result)
	}

	private createTransactionWithSymbol(tx: unknown) {
		return Object.assign({}, tx, {
			[SQLiteUnitOfWork.SQLITE_TRANSACTION_SYMBOL]: true,
		})
	}

	public static isClientTransaction(obj: any): obj is SQLiteUnitOfWork {
		return (
			Reflect.has(obj, SQLiteUnitOfWork.SQLITE_TRANSACTION_SYMBOL) &&
			Boolean(obj[SQLiteUnitOfWork.SQLITE_TRANSACTION_SYMBOL])
		)
	}
}
