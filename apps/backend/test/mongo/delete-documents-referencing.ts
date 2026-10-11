import type { Document } from "mongodb"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"

export interface CleanupTarget {
	collection: string
	fields: readonly string[]
}

export async function deleteDocumentsReferencing(
	connection: MongoConnection,
	ids: readonly string[],
	targets: readonly CleanupTarget[],
): Promise<void> {
	if (ids.length === 0) return
	for (const target of targets) {
		await connection.collection<Document>(target.collection).deleteMany({
			$or: target.fields.map((field) => ({ [field]: { $in: [...ids] } })),
		})
	}
}
