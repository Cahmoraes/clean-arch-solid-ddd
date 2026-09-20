import type { UserActivityPagination } from "@/features/activity/api/use-user-activity"

export const ACTIVITY_PAGE_SIZE_OPTIONS = [10, 20, 50] as const
export type ActivityPageSize = (typeof ACTIVITY_PAGE_SIZE_OPTIONS)[number]
export const DEFAULT_ACTIVITY_PAGE_SIZE: ActivityPageSize = 20

export function isActivityPageSize(value: number): value is ActivityPageSize {
	return ACTIVITY_PAGE_SIZE_OPTIONS.some((option) => option === value)
}

export function isValidActivityPageParam(pageParam: string | null): boolean {
	const parsedPage = Number(pageParam)
	return Number.isSafeInteger(parsedPage) && parsedPage > 0
}

export function getActivityPageFromParam(pageParam: string | null): number {
	return isValidActivityPageParam(pageParam) ? Number(pageParam) : 1
}

export function isValidActivityPageSizeParam(
	pageSizeParam: string | null,
): boolean {
	if (pageSizeParam === null || pageSizeParam === "") return false
	const parsedPageSize = Number(pageSizeParam)
	return (
		Number.isSafeInteger(parsedPageSize) && isActivityPageSize(parsedPageSize)
	)
}

export function getActivityPageSizeFromParam(
	pageSizeParam: string | null,
): ActivityPageSize {
	return isValidActivityPageSizeParam(pageSizeParam)
		? (Number(pageSizeParam) as ActivityPageSize)
		: DEFAULT_ACTIVITY_PAGE_SIZE
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
