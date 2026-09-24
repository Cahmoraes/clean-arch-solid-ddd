import { CardHeader, CardTitle } from "@/components/ui/card"
import type { UserActivityPagination } from "@/features/activity/api/use-user-activity"
import { ActivityPagination } from "@/features/activity/components/activity-pagination"
import {
	ACTIVITY_PAGE_SIZE_OPTIONS,
	type ActivityPageSize,
	DEFAULT_ACTIVITY_PAGE_SIZE,
	getTopActivityPage,
	isActivityPageSize,
	shouldShowTopPagination,
} from "@/features/activity/lib/activity-pagination"

export function ActivityPaginationCardHeader({
	pagination,
	isTransitioning,
	onPageChange,
	onPageSizeChange,
	pageSize = DEFAULT_ACTIVITY_PAGE_SIZE,
	testIdPrefix,
}: {
	pagination: UserActivityPagination | undefined
	isTransitioning: boolean
	onPageChange: (page: number) => void
	onPageSizeChange?: (pageSize: ActivityPageSize) => void
	pageSize?: ActivityPageSize
	testIdPrefix: string
}) {
	const showTopPagination = shouldShowTopPagination(pagination)
	const topPage = getTopActivityPage(pagination)
	const currentPageSize =
		pagination?.pageSize ??
		(isActivityPageSize(pageSize) ? pageSize : DEFAULT_ACTIVITY_PAGE_SIZE)

	return (
		<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border">
			<CardTitle as="h2">Histórico de atividades</CardTitle>
			<div className="flex flex-wrap items-center gap-3">
				<label className="inline-flex items-center gap-2 rounded-sm border bg-muted/40 px-2.5 py-1 font-display text-[15px] tracking-wide text-muted-foreground">
					<span>Itens por página</span>
					<select
						aria-label="Itens por página"
						value={String(currentPageSize)}
						onChange={(event) => {
							const nextPageSize = Number(event.target.value)
							if (isActivityPageSize(nextPageSize)) {
								onPageSizeChange?.(nextPageSize)
							}
						}}
						className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{ACTIVITY_PAGE_SIZE_OPTIONS.map((option) => (
							<option key={option} value={String(option)}>
								{option}
							</option>
						))}
					</select>
				</label>
				{showTopPagination ? (
					<ActivityPagination
						page={topPage}
						totalPages={pagination ? pagination.totalPages : 1}
						onChange={onPageChange}
						testIdPrefix={testIdPrefix}
						disabled={isTransitioning}
					/>
				) : null}
			</div>
		</CardHeader>
	)
}
