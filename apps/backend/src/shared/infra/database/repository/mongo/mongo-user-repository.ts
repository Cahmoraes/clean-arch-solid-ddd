import { inject, injectable } from "inversify"
import type { ClientSession, Collection, Filter } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { UserNotFoundError } from "@/shared/infra/errors/user-not-found-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { UserQuery } from "@/user/application/persistence/repository/user-query"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { User } from "@/user/domain/user"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

export type UserDocument = {
	_id: string
	name: string
	email: string
	password_hash: string | null
	google_id: string | null
	created_at: Date
	role: RoleTypes
	updated_at: Date
	status: StatusTypes
	billing_customer_id: string | null
	is_super_admin: boolean
	deleted_at: Date | null
}

const USER_QUERY_COLUMNS = {
	id: "_id",
	name: "name",
	email: "email",
	password: "password_hash",
	role: "role",
	createdAt: "created_at",
	updatedAt: "updated_at",
	status: "status",
	billingCustomerId: "billing_customer_id",
} as const satisfies Record<string, keyof UserDocument>

function isUserQueryField(
	field: string,
): field is keyof typeof USER_QUERY_COLUMNS {
	return field in USER_QUERY_COLUMNS
}

class UnsupportedUserQueryFieldError extends Error {
	constructor(field: string) {
		super(`UserQuery field "${field}" has no Mongo column`)
	}
}

@injectable()
export class MongoUserRepository implements UserRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): UserRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoUserRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async get(userQuery: UserQuery): Promise<User | null> {
		const document = await this.users().findOne(
			this.queryFilter(userQuery),
			sessionOptions(this.session),
		)
		return document ? this.restoreUser(document) : null
	}

	public async userOfId(id: string): Promise<User | null> {
		const document = await this.users().findOne(
			{ _id: id, deleted_at: null },
			sessionOptions(this.session),
		)
		return document ? this.restoreUser(document) : null
	}

	public async userOfEmail(email: string): Promise<User | null> {
		const document = await this.users().findOne(
			{ email, deleted_at: null },
			sessionOptions(this.session),
		)
		return document ? this.restoreUser(document) : null
	}

	public async userOfGoogleId(googleId: string): Promise<User | null> {
		const document = await this.users().findOne(
			{ google_id: googleId, deleted_at: null },
			sessionOptions(this.session),
		)
		return document ? this.restoreUser(document) : null
	}

	public async usersOfIds(ids: string[]): Promise<User[]> {
		const documents = await this.users()
			.find(
				{ _id: { $in: ids }, deleted_at: null },
				sessionOptions(this.session),
			)
			.toArray()
		return documents.map((document) => this.restoreUser(document))
	}

	public async updateManyStatus(
		ids: string[],
		status: StatusTypes,
	): Promise<number> {
		const result = await this.users().updateMany(
			{ _id: { $in: ids }, status: { $ne: status } },
			{ $set: { status, updated_at: new Date() } },
			sessionOptions(this.session),
		)
		return result.modifiedCount
	}

	public async save(user: User): Promise<void> {
		await this.users().insertOne(
			{
				_id: user.id,
				name: user.name,
				email: user.email,
				password_hash: user.password ?? null,
				google_id: user.googleId ?? null,
				created_at: user.createdAt,
				role: user.role,
				updated_at: new Date(),
				status: user.status,
				billing_customer_id: user.billingCustomerId ?? null,
				// Same as PrismaUserRepository.save: the flag is not written on create.
				is_super_admin: false,
				deleted_at: user.deletedAt ?? null,
			},
			sessionOptions(this.session),
		)
	}

	public async update(user: User): Promise<void> {
		const result = await this.users().updateOne(
			{ _id: user.id },
			{ $set: this.updateFields(user) },
			sessionOptions(this.session),
		)
		if (result.matchedCount === 0) throw new UserNotFoundError(user.id)
	}

	private updateFields(user: User): Partial<UserDocument> {
		return {
			email: user.email,
			name: user.name,
			password_hash: user.password ?? null,
			google_id: user.googleId ?? null,
			created_at: user.createdAt,
			role: user.role,
			status: user.status,
			billing_customer_id: user.billingCustomerId ?? null,
			is_super_admin: user.isSuperAdmin,
			updated_at: user.updatedAt ? user.updatedAt : new Date(),
			deleted_at: user.deletedAt ?? null,
		}
	}

	private users(): Collection<UserDocument> {
		return this.connection.collection<UserDocument>(COLLECTIONS.USERS)
	}

	private queryFilter(userQuery: UserQuery): Filter<UserDocument> {
		const conditions = Object.entries(userQuery.fields)
			.filter(([, value]) => value !== undefined)
			.map(([field, value]) => [this.columnOf(field), value] as const)
		return { ...Object.fromEntries(conditions), deleted_at: null }
	}

	private columnOf(field: string): string {
		if (!isUserQueryField(field)) {
			throw new UnsupportedUserQueryFieldError(field)
		}
		return USER_QUERY_COLUMNS[field]
	}

	private restoreUser(document: UserDocument): User {
		return User.restore({
			id: document._id,
			email: document.email,
			name: document.name,
			password: document.password_hash ?? undefined,
			googleId: document.google_id ?? undefined,
			createdAt: new Date(document.created_at),
			updatedAt: new Date(document.updated_at),
			role: document.role,
			status: document.status,
			billingCustomerId: document.billing_customer_id ?? undefined,
			deletedAt: document.deleted_at ?? undefined,
			isSuperAdmin: document.is_super_admin ?? false,
		})
	}
}
