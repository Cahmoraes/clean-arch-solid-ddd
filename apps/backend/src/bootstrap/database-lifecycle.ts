import { initializeMongo } from "@/shared/infra/database/connection/mongo/initialize-mongo"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { isMongoEnabled } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

function mongoConnection(): MongoConnection {
	return container.get<MongoConnection>(SHARED_TYPES.Mongo.Connection)
}

export async function startDatabase(): Promise<void> {
	if (!isMongoEnabled()) return
	await initializeMongo(mongoConnection())
}

export async function stopDatabase(): Promise<void> {
	if (!isMongoEnabled()) return
	await mongoConnection().disconnect()
}
