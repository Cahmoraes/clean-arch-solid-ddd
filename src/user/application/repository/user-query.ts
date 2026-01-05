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
}
