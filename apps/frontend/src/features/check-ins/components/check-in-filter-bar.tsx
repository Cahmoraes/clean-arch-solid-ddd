"use client"

import { Filter } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
	SegmentedControl,
	type SegmentedItem,
} from "@/components/ui/segmented-control"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
import type { CheckInStats } from "../api/extended-paths.js"
import type { CheckInFilterStatus } from "../hooks/use-check-in-filters.js"

type FilterValue = "todos" | "pending" | "validated" | "rejected"

const STATUS_LABEL: Record<NonNullable<CheckInFilterStatus>, string> = {
	pending: "Pendentes",
	validated: "Aprovados",
	rejected: "Rejeitados",
}

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
	const [sheetOpen, setSheetOpen] = useState(false)
	const [pendingStatus, setPendingStatus] =
		useState<CheckInFilterStatus>(status)

	function openSheet() {
		setPendingStatus(status)
		setSheetOpen(true)
	}

	function applyFilter() {
		onStatusChange(pendingStatus)
		setSheetOpen(false)
	}

	function clearFilter() {
		onStatusChange(undefined)
		setSheetOpen(false)
	}

	return (
		<>
			{/* Desktop: inline filter bar */}
			<div className="hidden w-full md:block">
				<SegmentedControl
					aria-label="Filtrar check-ins por status"
					items={buildItems(stats)}
					value={toFilterValue(status)}
					onValueChange={(value) => onStatusChange(toStatus(value))}
					className="w-full [&>button]:flex-1 [&>button]:justify-center"
					countFloat={stats !== undefined}
				/>
			</div>

			{/* Mobile: botão + Sheet */}
			<div className="flex w-full items-center gap-2 md:hidden">
				<Button
					variant="outline"
					size="sm"
					onClick={openSheet}
					aria-label="Abrir filtros"
				>
					<Filter className="mr-2 h-4 w-4" aria-hidden="true" />
					Filtros
				</Button>
				{status && (
					<span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
						{STATUS_LABEL[status]}
					</span>
				)}
			</div>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="bottom" className="pb-8">
					<SheetHeader>
						<SheetTitle>Filtros</SheetTitle>
					</SheetHeader>
					<div className="mt-4 flex flex-col gap-4">
						<SegmentedControl
							aria-label="Selecionar filtro de status"
							items={buildItems(stats)}
							value={toFilterValue(pendingStatus)}
							onValueChange={(value) => setPendingStatus(toStatus(value))}
							countFloat={stats !== undefined}
						/>
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={clearFilter}
							>
								Limpar
							</Button>
							<Button className="flex-1" onClick={applyFilter}>
								Aplicar
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</>
	)
}
