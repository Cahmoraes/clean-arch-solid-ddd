import type { UserActivityPagination } from "@/features/activity/api/use-user-activity"

export function isValidActivityPageParam(pageParam: string | null): boolean {
	const parsedPage = Number(pageParam)
	return Number.isSafeInteger(parsedPage) && parsedPage > 0
}

export function getActivityPageFromParam(pageParam: string | null): number {
	return isValidActivityPageParam(pageParam) ? Number(pageParam) : 1
}

export function shouldShowTopPagination(
	pagination: UserActivityPagination | undefined,
): boolean {
	return !!pagination && pagination.totalPages > 1
}

export function getTopActivityPage(
	pagination: UserActivityPagination | undefined,
): number {
	if (!pagination) return 1
	return Math.min(
		Math.max(pagination.page, 1),
		Math.max(pagination.totalPages, 1),
	)
}
