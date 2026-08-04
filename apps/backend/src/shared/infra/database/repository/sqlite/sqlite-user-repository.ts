import { inject, injectable } from "inversify"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { UserQuery } from "@/user/application/persistence/repository/user-query"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { User } from "@/user/domain/user"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"
import type { SQLiteConnection } from "../../connection/sqlite-connection"
import { SQLiteUnitOfWork } from "../unit-of-work/sqlite-unit-of-work"

interface UserData {
	id: string
	name: string
	email: string
	password_hash: string | null
	google_id: string | null
	created_at: Date
	updated_at: Date
	role: RoleTypes
	status: StatusTypes
	billingCustomerId?: string
	is_super_admin?: boolean | number | null
	deleted_at?: string | null
}

@injectable()
export class SQLiteUserRepository implements UserRepository {
	constructor(
		@inject(SHARED_TYPES.SQLite.Client)
		private readonly sqliteConnection: SQLiteConnection,
	) {}

	public async get(userQuery: UserQuery): Promise<User | null> {
		const userDataOrNull = this.sqliteConnection
			.query(/*SQL*/ `
        SELECT * FROM
          "users"
        WHERE
          ${userQuery.sql} AND "deleted_at" IS NULL
      `)
			.get(...userQuery.values)
		if (!userDataOrNull) return null
		this.assertUserData(userDataOrNull)
		return this.restoreUser(userDataOrNull)
	}

	public async userOfEmail(email: string): Promise<User | null> {
		const userDataOrNull = this.sqliteConnection
			.query(/*SQL*/ `
      SELECT * FROM "users" WHERE "email" = ? AND "deleted_at" IS NULL
    `)
			.get(email)
		if (!userDataOrNull) return null
		this.assertUserData(userDataOrNull)
		return this.restoreUser(userDataOrNull)
	}

	public async userOfGoogleId(googleId: string): Promise<User | null> {
		const userDataOrNull = this.sqliteConnection
			.query(/*SQL*/ `
      SELECT * FROM "users" WHERE "google_id" = ? AND "deleted_at" IS NULL
    `)
			.get(googleId)
		if (!userDataOrNull) return null
		this.assertUserData(userDataOrNull)
		return this.restoreUser(userDataOrNull)
	}

	private assertUserData(object: any): asserts object is UserData {
		if (!Reflect.has(object, "id")) throw new Error("Invalid object")
	}

	private async restoreUser(userData: UserData): Promise<User> {
		return User.restore({
			id: userData.id,
			email: userData.email,
			name: userData.name,
			password: userData.password_hash ?? undefined,
			googleId: userData.google_id ?? undefined,
			createdAt: new Date(userData.created_at),
			updatedAt: userData.updated_at
				? new Date(userData.updated_at)
				: undefined,
			role: userData.role,
			status: userData.status,
			billingCustomerId: userData.billingCustomerId,
			isSuperAdmin: Boolean(userData.is_super_admin ?? false),
			deletedAt: userData.deleted_at
				? new Date(userData.deleted_at)
				: undefined,
		})
	}

	public async userOfId(id: string): Promise<User | null> {
		const userDataOrNull = this.sqliteConnection
			.query(/*SQL*/ `
        SELECT * FROM
          "users"
        WHERE
          "id" = ? AND "deleted_at" IS NULL
      `)
			.get(id)
		if (!userDataOrNull) return null
		this.assertUserData(userDataOrNull)
		return this.restoreUser(userDataOrNull)
	}

	private serializeDate(date?: Date): string | null {
		return date ? date.toISOString() : null
	}

	public async save(user: User): Promise<void> {
		this.sqliteConnection
			.query(/*SQL*/ `
      INSERT INTO
        "users" (
          "email",
          "name",
          "password_hash",
          "google_id",
          "created_at",
          "role",
          "status",
          "billing_customer_id",
          "is_super_admin",
          "deleted_at"
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `)
			.run(
				user.email,
				user.name,
				user.password ?? null,
				user.googleId ?? null,
				user.createdAt.toISOString(),
				user.role,
				user.status,
				user.billingCustomerId ?? null,
				user.isSuperAdmin ? 1 : 0,
				this.serializeDate(user.deletedAt),
			)
	}

	public async update(user: User): Promise<void> {
		this.sqliteConnection
			.query(/*SQL*/ `
      UPDATE
        "users"
      SET
        "email" = ?,
        "name" = ?,
        "password_hash" = ?,
        "google_id" = ?,
        "created_at" = ?,
        "role" = ?,
        "status" = ?,
        "billing_customer_id" = ?,
        "is_super_admin" = ?,
        "updated_at" = ?,
        "deleted_at" = ?
      WHERE
        "id" = ?
    `)
			.run(
				user.email,
				user.name,
				user.password ?? null,
				user.googleId ?? null,
				user.createdAt.toISOString(),
				user.role,
				user.status,
				user.billingCustomerId ?? null,
				user.isSuperAdmin ? 1 : 0,
				user.updatedAt
					? user.updatedAt.toISOString()
					: new Date().toISOString(),
				this.serializeDate(user.deletedAt),
				user.id,
			)
	}

	public withTransaction<TX extends object>(sqliteClient: TX): UserRepository {
		if (!SQLiteUnitOfWork.isClientTransaction(sqliteClient)) {
			throw new InvalidTransactionInstance(sqliteClient)
		}
		return this
	}

	public async usersOfIds(ids: string[]): Promise<User[]> {
		if (ids.length === 0) return []
		const placeholders = ids.map(() => "?").join(", ")
		const rows = this.sqliteConnection
			.query(/*SQL*/ `
        SELECT * FROM
          "users"
        WHERE
          "id" IN (${placeholders}) AND "deleted_at" IS NULL
      `)
			.all(...ids) as UserData[]
		return Promise.all(rows.map((row) => this.restoreUser(row)))
	}

	public async updateManyStatus(
		ids: string[],
		status: StatusTypes,
	): Promise<number> {
		if (ids.length === 0) return 0
		const placeholders = ids.map(() => "?").join(", ")
		const result = this.sqliteConnection
			.query(/*SQL*/ `
        UPDATE
          "users"
        SET
          "status" = ?
        WHERE
          "id" IN (${placeholders}) AND "status" != ?
      `)
			.run(status, ...ids, status)
		return result.changes
	}
}
