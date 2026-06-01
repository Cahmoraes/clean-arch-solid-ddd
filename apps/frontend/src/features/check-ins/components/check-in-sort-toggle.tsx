import { ArrowDown, ArrowUp } from "lucide-react"
import type { SortOrder } from "../api/extended-paths"

export type { SortOrder }

export interface CheckInSortToggleProps {
	value: SortOrder
	onValueChange: (value: SortOrder) => void
}

export function CheckInSortToggle({
	value,
	onValueChange,
}: CheckInSortToggleProps) {
	const isDesc = value === "desc"

	function handleClick() {
		onValueChange(isDesc ? "asc" : "desc")
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			className="inline-flex h-[52px] items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm text-foreground transition-colors hover:bg-surface/80"
		>
			{isDesc ? (
				<ArrowDown className="h-4 w-4 shrink-0" aria-hidden="true" />
			) : (
				<ArrowUp className="h-4 w-4 shrink-0" aria-hidden="true" />
			)}
			<span>{isDesc ? "Mais recentes" : "Mais antigos"}</span>
		</button>
	)
}
