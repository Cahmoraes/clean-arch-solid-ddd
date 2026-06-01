import {
	SegmentedControl,
	type SegmentedItem,
} from "@/components/ui/segmented-control"
import type { CheckInStats } from "../api/extended-paths.js"
import type { CheckInFilterStatus } from "../hooks/use-check-in-filters.js"

type FilterValue = "todos" | "pending" | "validated" | "rejected"

function buildItems(
	stats?: CheckInStats,
): ReadonlyArray<SegmentedItem<FilterValue>> {
	return [
		{ value: "todos", label: "Todos", count: stats?.total },
		{ value: "pending", label: "Pendentes", count: stats?.pending },
		{ value: "validated", label: "Aprovados", count: stats?.validated },
		{ value: "rejected", label: "Rejeitados", count: stats?.rejected },
	]
}

function toFilterValue(status: CheckInFilterStatus): FilterValue {
	return status ?? "todos"
}

function toStatus(value: FilterValue): CheckInFilterStatus {
	return value === "todos" ? undefined : value
}

export interface CheckInFilterBarProps {
	status: CheckInFilterStatus
	onStatusChange: (status: CheckInFilterStatus) => void
	stats?: CheckInStats
}

export function CheckInFilterBar({
	status,
	onStatusChange,
	stats,
}: CheckInFilterBarProps) {
	return (
		<SegmentedControl
			aria-label="Filtrar check-ins por status"
			items={buildItems(stats)}
			value={toFilterValue(status)}
			onValueChange={(value) => onStatusChange(toStatus(value))}
			className="w-full [&>button]:flex-1 [&>button]:justify-center"
			countFloat={stats !== undefined}
		/>
	)
}
