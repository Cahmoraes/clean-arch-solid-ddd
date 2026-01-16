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
	password_hash: string
	created_at: Date
	updated_at: Date
	role: RoleTypes
	status: StatusTypes
	billingCustomerId?: string
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
          ${userQuery.sql}  
      `)
			.get(...userQuery.values)
		if (!userDataOrNull) return null
		this.assertUserData(userDataOrNull)
		return this.restoreUser(userDataOrNull)
	}

	public async userOfEmail(email: string): Promise<User | null> {
		const userDataOrNull = this.sqliteConnection
			.query(/*SQL*/ `
      SELECT * FROM "users" WHERE "email" = ?  
    `)
			.get(email)
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
			password: userData.password_hash,
			createdAt: new Date(userData.created_at),
			updatedAt: userData.updated_at
				? new Date(userData.updated_at)
				: undefined,
			role: userData.role,
			status: userData.status,
			billingCustomerId: userData.billingCustomerId,
		})
	}

	public async userOfId(id: string): Promise<User | null> {
		const userDataOrNull = this.sqliteConnection
			.query(/*SQL*/ `
        SELECT * FROM 
          "users" 
        WHERE 
          "id" = ?  
      `)
			.get(id)
		if (!userDataOrNull) return null
		this.assertUserData(userDataOrNull)
		return this.restoreUser(userDataOrNull)
	}

	public async save(user: User): Promise<void> {
		this.sqliteConnection
			.query(/*SQL*/ `
      INSERT INTO 
        "users" (
          "email", 
          "name", 
          "password_hash", 
          "created_at", 
          "role", 
          "status", 
          "billing_customer_id"
        )
      VALUES (?, ?, ?, ?, ?, ?, ?); 
    `)
			.run(
				user.email,
				user.name,
				user.password,
				user.createdAt.toISOString(),
				user.role,
				user.status,
				user.billingCustomerId ?? null,
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
        "created_at" = ?,
        "role" = ?,
        "status" = ?,
        "billing_customer_id" = ?,
        "updated_at" = ?
      WHERE 
        "id" = ?
    `)
			.run(
				user.email,
				user.name,
				user.password,
				user.createdAt.toISOString(),
				user.role,
				user.status,
				user.billingCustomerId ?? null,
				user.updatedAt
					? user.updatedAt.toISOString()
					: new Date().toISOString(),
				user.id,
			)
	}

	public async delete(user: User): Promise<void> {
		this.sqliteConnection
			.query(/*SQL*/ `
      DELETE FROM 
        "users"
      WHERE
        id = ?  
    `)
			.run(user.id)
	}

	public withTransaction<TX extends object>(sqliteClient: TX): UserRepository {
		if (!SQLiteUnitOfWork.isClientTransaction(sqliteClient)) {
			throw new InvalidTransactionInstance(sqliteClient)
		}
		return this
	}
}
