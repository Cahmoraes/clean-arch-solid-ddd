import type { MongoConnection } from "./mongo-connection"

export async function initializeMongo(
	connection: MongoConnection,
): Promise<void> {
	try {
		await connection.connect()
		await connection.assertTransactionsSupported()
		await connection.ensureIndexes()
	} catch (error) {
		throw await releaseClient(connection, error)
	}
}

// Release the client so a failed startup does not keep the process alive. A failure
// to close must not replace the startup error, but must never be lost either. Returns the error to throw.
async function releaseClient(
	connection: MongoConnection,
	startupError: unknown,
): Promise<unknown> {
	try {
		await connection.disconnect()
		return startupError
	} catch (closeError) {
		return attachCloseError(startupError, closeError)
	}
}

// Keeps the startup error as the thrown one, with the close error at the end of its cause chain.
// When the chain has no free Error slot (non-Error startup error, or a tail with a non-Error cause),
// both errors are grouped so neither is dropped.
function attachCloseError(startupError: unknown, closeError: unknown): unknown {
	const tail = lastInCauseChain(startupError)
	if (tail instanceof Error && tail.cause === undefined) {
		tail.cause = closeError
		return startupError
	}
	return new AggregateError(
		[startupError, closeError],
		"MongoDB startup failed and the client could not be closed",
	)
}

function lastInCauseChain(error: unknown): unknown {
	let tail = error
	while (tail instanceof Error && tail.cause instanceof Error) {
		tail = tail.cause
	}
	return tail
}
