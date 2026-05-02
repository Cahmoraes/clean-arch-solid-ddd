import type { CreateUserDto } from "@/user/domain/user"

type UserField = keyof CreateUserDto

type UserObjectFields = {
	[Property in UserField]?: NonNullable<CreateUserDto[Property]>
}

type UserValues = CreateUserDto[keyof UserObjectFields]

type UserCreatePartial = Partial<CreateUserDto>

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
		console.log(this._fields)
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
