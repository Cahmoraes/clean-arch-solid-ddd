import { CardHeader, CardTitle } from "@/components/ui/card"
import { NumberedPagination } from "@/components/ui/numbered-pagination"
import type { UserActivityPagination } from "@/features/activity/api/use-user-activity"
import {
	getTopActivityPage,
	shouldShowTopPagination,
} from "@/features/activity/lib/activity-pagination"

export function ActivityPaginationCardHeader({
	pagination,
	isTransitioning,
	onPageChange,
	testIdPrefix,
}: {
	pagination: UserActivityPagination | undefined
	isTransitioning: boolean
	onPageChange: (page: number) => void
	testIdPrefix: string
}) {
	const showTopPagination = shouldShowTopPagination(pagination)
	const topPage = getTopActivityPage(pagination)

	return (
		<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border">
			<CardTitle as="h2">Histórico de atividades</CardTitle>
			<div className="flex flex-wrap items-center gap-3">
				<span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
					20 por página
				</span>
				{showTopPagination ? (
					<NumberedPagination
						page={topPage}
						totalPages={pagination ? pagination.totalPages : 1}
						onChange={onPageChange}
						testIdPrefix={testIdPrefix}
						disabled={isTransitioning}
						className="mx-0 w-auto justify-end"
					/>
				) : null}
			</div>
		</CardHeader>
	)
}
