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

export interface UserActivityPagination {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

export interface UserActivityPage {
	items: UserActivityItem[]
	pagination: UserActivityPagination
}

export interface UserActivityDao {
	findActivityPage(
		userId: string,
		page: number,
		pageSize: number,
	): Promise<UserActivityPage>
}
