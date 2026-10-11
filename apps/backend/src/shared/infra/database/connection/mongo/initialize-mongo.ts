import type { MongoConnection } from "./mongo-connection"

export async function initializeMongo(
	connection: MongoConnection,
): Promise<void> {
	try {
		await connection.connect()
		await connection.assertTransactionsSupported()
		await connection.ensureIndexes()
	} catch (error) {
		await releaseClient(connection, error)
		throw error
	}
}

// Release the client so a failed startup does not keep the process alive. A failure
// to close must not replace the startup error, so it is attached at the end of its cause chain.
async function releaseClient(
	connection: MongoConnection,
	startupError: unknown,
): Promise<void> {
	try {
		await connection.disconnect()
	} catch (closeError) {
		const tail = lastInCauseChain(startupError)
		if (tail instanceof Error) tail.cause = closeError
	}
}

function lastInCauseChain(error: unknown): unknown {
	let tail = error
	while (tail instanceof Error && tail.cause instanceof Error) {
		tail = tail.cause
	}
	return tail
}
