import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

type UserQueryDTO = {
	id?: string | null
	name?: string
	email?: string
	password?: string | null
	role?: RoleTypes
	createdAt?: Date
	updatedAt?: Date
	status?: StatusTypes
	billingCustomerId?: string
}

type UserField = keyof UserQueryDTO

type UserObjectFields = {
	[Property in UserField]?: NonNullable<UserQueryDTO[Property]>
}

type UserValues = UserQueryDTO[keyof UserObjectFields]

type UserCreatePartial = Partial<UserQueryDTO>

export class UserQuery {
	private readonly _user: UserCreatePartial
	private readonly _fields: Map<UserField, UserValues>

	private constructor(user: UserCreatePartial) {
		this._user = user
		this._fields = new Map()
	}

	public static from(user: UserCreatePartial): UserQuery {
		return new UserQuery(user)
	}

	get userDTO(): UserCreatePartial {
		return this._user
	}

	get fields(): UserObjectFields {
		return Object.fromEntries(this._fields)
	}

	public addField(field: UserField): this {
		this._fields.set(field, this.userDTO[field])
		return this
	}

	public removeField(field: UserField): this {
		this._fields.delete(field)
		return this
	}

	public get sql(): string {
		const sql: string[] = []
		for (const [field] of this._fields) {
			sql.push(`"${field}" = ?`)
		}
		return sql.join(" AND ")
	}

	public get values(): any {
		const values = []
		for (const value of this._fields.values()) {
			values.push(value)
		}
		return values
	}
}
