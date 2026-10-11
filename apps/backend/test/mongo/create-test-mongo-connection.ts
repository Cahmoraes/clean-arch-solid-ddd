import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { env } from "@/shared/infra/env"

export async function createTestMongoConnection(
	dbName?: string,
): Promise<MongoConnection> {
	const url = env.DATABASE_URL_MONGO
	if (!url) {
		throw new Error(
			"DATABASE_URL_MONGO is required for the Mongo integration tests (see .env.test)",
		)
	}
	const connection = new MongoConnection(url, dbName)
	await connection.connect()
	await connection.assertTransactionsSupported()
	await connection.ensureIndexes()
	return connection
}
