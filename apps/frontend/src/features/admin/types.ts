export type UserFilter = "all" | "member" | "admin" | "active" | "inactive"

export interface UserStats {
	total: number
	members: number
	admins: number
	active: number
	inactive: number
}
