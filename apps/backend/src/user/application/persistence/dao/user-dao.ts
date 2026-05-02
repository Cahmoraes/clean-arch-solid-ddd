import type { RoleTypes } from "@/user/domain/value-object/role"

export interface FetchUsersInput {
	page: number
	limit: number
}

export interface FetchUsersData {
	id: string
	role: RoleTypes
	createdAt: string
	name: string
	email: string
}

export interface FetchUsersOutput {
	usersData: FetchUsersData[]
	total: number
}

export interface UserDAO {
	fetchAndCountUsers(input: FetchUsersInput): Promise<FetchUsersOutput>
}
