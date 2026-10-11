import { inject, injectable } from "inversify"
import type { Filter } from "mongodb"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import type { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

@injectable()
export class MongoActiveRecipientsProvider implements ActiveRecipientsProvider {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async listActiveUserIds(audience: NoticeAudience): Promise<string[]> {
		const filter: Filter<UserDocument> = {
			status: "activated",
			deleted_at: null,
			...this.roleFilter(audience),
		}
		const users = await this.connection
			.collection<UserDocument>(COLLECTIONS.USERS)
			.find(filter, { projection: { _id: 1 } })
			.toArray()
		return users.map((user) => user._id)
	}

	private roleFilter(
		audience: NoticeAudience,
	): { role: "MEMBER" | "ADMIN" } | undefined {
		switch (audience.value) {
			case "MEMBERS":
				return { role: "MEMBER" }
			case "ADMINS":
				return { role: "ADMIN" }
			case "ALL":
				return undefined
		}
	}
}
