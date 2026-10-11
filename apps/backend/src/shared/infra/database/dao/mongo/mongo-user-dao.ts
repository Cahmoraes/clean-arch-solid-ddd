import { inject, injectable } from "inversify"
import type { Filter } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { escapeRegExp } from "@/shared/infra/database/repository/mongo/escape-regexp"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	FetchUsersInput,
	FetchUsersOutput,
	UserDAO,
	UserStatsOutput,
} from "@/user/application/persistence/dao/user-dao"

@injectable()
export class MongoUserDao implements UserDAO {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async fetchAndCountUsers(
		input: FetchUsersInput,
	): Promise<FetchUsersOutput> {
		const filter = this.buildFilter(input)
		const users = this.connection.collection<UserDocument>(COLLECTIONS.USERS)
		const [documents, total] = await Promise.all([
			users
				.find(filter)
				.sort({ created_at: 1, _id: 1 })
				.skip((input.page - 1) * input.limit)
				.limit(input.limit)
				.toArray(),
			users.countDocuments(filter),
		])
		return {
			total,
			usersData: documents.map((document) => ({
				id: document._id,
				email: document.email,
				name: document.name,
				role: document.role,
				status: document.status,
				isSuperAdmin: document.is_super_admin,
				createdAt: document.created_at.toISOString(),
			})),
		}
	}

	public async countUserStats(): Promise<UserStatsOutput> {
		const users = this.connection.collection<UserDocument>(COLLECTIONS.USERS)
		const [total, members, admins, active, inactive] = await Promise.all([
			users.countDocuments({ deleted_at: null }),
			users.countDocuments({ deleted_at: null, role: "MEMBER" }),
			users.countDocuments({ deleted_at: null, role: "ADMIN" }),
			users.countDocuments({ deleted_at: null, status: "activated" }),
			users.countDocuments({ deleted_at: null, status: "suspended" }),
		])
		return { total, members, admins, active, inactive }
	}

	private buildFilter(input: FetchUsersInput): Filter<UserDocument> {
		const filter: Filter<UserDocument> = { deleted_at: null }
		if (input.query) {
			const pattern = escapeRegExp(input.query)
			filter.$or = [
				{ name: { $regex: pattern, $options: "i" } },
				{ email: { $regex: pattern, $options: "i" } },
			]
		}
		if (input.role) filter.role = input.role
		if (input.status === "active") filter.status = "activated"
		if (input.status === "inactive") filter.status = "suspended"
		return filter
	}
}
