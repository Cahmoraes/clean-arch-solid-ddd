import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface FetchUsersInput {
	page: number
	limit: number
	query?: string
}

export interface FetchUsersData {
	id: string
	role: RoleTypes
	status: StatusTypes
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
