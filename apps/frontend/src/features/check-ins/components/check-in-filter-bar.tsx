import { Button } from "@/components/ui/button"
import type { CheckInFilterStatus } from "../hooks/use-check-in-filters.js"

const FILTERS: { label: string; value: CheckInFilterStatus }[] = [
	{ label: "Todos", value: undefined },
	{ label: "Pendentes", value: "pending" },
	{ label: "Aprovados", value: "validated" },
	{ label: "Rejeitados", value: "rejected" },
]

export interface CheckInFilterBarProps {
	status: CheckInFilterStatus
	onStatusChange: (status: CheckInFilterStatus) => void
}

export function CheckInFilterBar({
	status,
	onStatusChange,
}: CheckInFilterBarProps) {
	return (
		<fieldset
			className="flex flex-wrap gap-2 border-0 p-0"
			aria-label="Filtrar check-ins por status"
		>
			{FILTERS.map((filter) => (
				<Button
					key={filter.label}
					variant={status === filter.value ? "primary" : "outline"}
					size="sm"
					className="rounded-md"
					onClick={() => onStatusChange(filter.value)}
					aria-pressed={status === filter.value}
				>
					{filter.label}
				</Button>
			))}
		</fieldset>
	)
}
