import { inject, injectable } from "inversify"
import { ClientSession } from "mongodb"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Callback, UnitOfWork } from "./unit-of-work"

@injectable()
export class MongoUnitOfWork implements UnitOfWork {
	public static readonly MONGO_SESSION_SYMBOL = Symbol("MONGO_SESSION")

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async runTransaction<T>(callback: Callback<T>): Promise<T> {
		const session = this.connection.client().startSession()
		Object.defineProperty(session, MongoUnitOfWork.MONGO_SESSION_SYMBOL, {
			value: true,
		})
		try {
			return await session.withTransaction(() => callback(session))
		} finally {
			await session.endSession()
		}
	}

	public static isClientSession(obj: unknown): obj is ClientSession {
		return (
			obj instanceof ClientSession &&
			Reflect.get(obj, MongoUnitOfWork.MONGO_SESSION_SYMBOL) === true
		)
	}
}
