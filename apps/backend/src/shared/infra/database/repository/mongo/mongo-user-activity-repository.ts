import { randomUUID } from "node:crypto"
import { inject, injectable } from "inversify"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	RecordUserActivityInput,
	UserActivityRepository,
} from "@/user/application/persistence/repository/user-activity-repository"

export type UserActivityEventDocument = {
	_id: string
	user_id: string
	type: string
	description: string
	metadata: Record<string, unknown> | null
	occurred_at: Date
	created_at: Date
}

@injectable()
export class MongoUserActivityRepository implements UserActivityRepository {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async record(input: RecordUserActivityInput): Promise<void> {
		await this.connection
			.collection<UserActivityEventDocument>(COLLECTIONS.USER_ACTIVITY_EVENTS)
			.insertOne({
				_id: randomUUID(),
				user_id: input.userId,
				type: input.type,
				description: input.description,
				metadata: input.metadata ?? null,
				occurred_at: input.occurredAt,
				created_at: new Date(),
			})
	}
}
