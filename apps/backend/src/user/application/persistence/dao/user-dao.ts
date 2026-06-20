import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface FetchUsersInput {
	page: number
	limit: number
	query?: string
	role?: RoleTypes
	status?: "active" | "inactive"
}

export interface FetchUsersData {
	id: string
	role: RoleTypes
	status: StatusTypes
	createdAt: string
	name: string
	email: string
	isSuperAdmin: boolean
}

export interface FetchUsersOutput {
	usersData: FetchUsersData[]
	total: number
}

export interface UserStatsOutput {
	total: number
	members: number
	admins: number
	active: number
	inactive: number
}

export interface UserDAO {
	fetchAndCountUsers(input: FetchUsersInput): Promise<FetchUsersOutput>
	countUserStats(): Promise<UserStatsOutput>
}
