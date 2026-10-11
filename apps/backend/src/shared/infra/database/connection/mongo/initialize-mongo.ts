import type { MongoConnection } from "./mongo-connection"

export async function initializeMongo(
	connection: MongoConnection,
): Promise<void> {
	try {
		await connection.connect()
		await connection.assertTransactionsSupported()
		await connection.ensureIndexes()
	} catch (error) {
		// Release the client so a failed startup does not keep the process alive.
		await connection.disconnect()
		throw error
	}
}
