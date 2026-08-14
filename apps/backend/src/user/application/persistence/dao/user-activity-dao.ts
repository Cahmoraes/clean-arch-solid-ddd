export type UserActivityItemType =
	| "LOGIN"
	| "PASSWORD_CHANGED"
	| "ACCOUNT_LOCKED"
	| "GOOGLE_LINKED"
	| "PROFILE_UPDATED"
	| "ROLE_CHANGED"
	| "STATUS_CHANGED"
	| "CHECK_IN"

export interface UserActivityItem {
	id: string
	type: UserActivityItemType
	description: string
	occurredAt: Date
}

export interface UserActivityDao {
	findRecentActivity(userId: string, limit: number): Promise<UserActivityItem[]>
}
