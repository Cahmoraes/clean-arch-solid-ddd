import type { ClientSession } from "mongodb"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"

export function sessionOptions(session: ClientSession | undefined): {
	session?: ClientSession
} {
	return session ? { session } : {}
}

export async function runInTransaction<T>(
	connection: MongoConnection,
	current: ClientSession | undefined,
	work: (session: ClientSession) => Promise<T>,
): Promise<T> {
	if (current) return work(current)
	const session = connection.client().startSession()
	try {
		return await session.withTransaction(() => work(session))
	} finally {
		await session.endSession()
	}
}
