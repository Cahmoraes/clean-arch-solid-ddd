import {
	SegmentedControl,
	type SegmentedItem,
} from "@/components/ui/segmented-control"
import type { CheckInFilterStatus } from "../hooks/use-check-in-filters.js"

type FilterValue = "todos" | "pending" | "validated" | "rejected"

const ITEMS: ReadonlyArray<SegmentedItem<FilterValue>> = [
	{ value: "todos", label: "Todos" },
	{ value: "pending", label: "Pendentes" },
	{ value: "validated", label: "Aprovados" },
	{ value: "rejected", label: "Rejeitados" },
]

function toFilterValue(status: CheckInFilterStatus): FilterValue {
	return status ?? "todos"
}

function toStatus(value: FilterValue): CheckInFilterStatus {
	return value === "todos" ? undefined : value
}

export interface CheckInFilterBarProps {
	status: CheckInFilterStatus
	onStatusChange: (status: CheckInFilterStatus) => void
}

export function CheckInFilterBar({
	status,
	onStatusChange,
}: CheckInFilterBarProps) {
	return (
		<SegmentedControl
			aria-label="Filtrar check-ins por status"
			items={ITEMS}
			value={toFilterValue(status)}
			onValueChange={(value) => onStatusChange(toStatus(value))}
			className="w-full [&>button]:flex-1 [&>button]:justify-center"
		/>
	)
}
