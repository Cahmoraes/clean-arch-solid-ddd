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
import { cn } from "@/lib/cn"
import type { UserFilter, UserStats } from "../types"

function buildItems(
	stats?: UserStats,
): ReadonlyArray<SegmentedItem<UserFilter>> {
	return [
		{ value: "all", label: "Todos", count: stats?.total },
		{ value: "member", label: "Membros", count: stats?.members },
		{ value: "admin", label: "Administradores", count: stats?.admins },
		{ value: "active", label: "Ativos", count: stats?.active },
		{ value: "inactive", label: "Inativos", count: stats?.inactive },
	]
}

const FILTER_LABEL: Record<UserFilter, string> = {
	all: "Todos",
	member: "Membros",
	admin: "Administradores",
	active: "Ativos",
	inactive: "Inativos",
}

export interface UserFilterBarProps {
	activeFilter: UserFilter
	stats?: UserStats
	onFilterChange: (filter: UserFilter) => void
	className?: string
}

export function UserFilterBar({
	activeFilter,
	stats,
	onFilterChange,
	className,
}: UserFilterBarProps) {
	const [sheetOpen, setSheetOpen] = useState(false)
	const [pendingFilter, setPendingFilter] = useState<UserFilter>(activeFilter)

	function openSheet() {
		setPendingFilter(activeFilter)
		setSheetOpen(true)
	}

	function applyFilter() {
		onFilterChange(pendingFilter)
		setSheetOpen(false)
	}

	function clearFilter() {
		onFilterChange("all")
		setSheetOpen(false)
	}

	return (
		<>
			{/* Desktop: inline filter bar */}
			<div className="hidden w-full md:block">
				<SegmentedControl
					aria-label="Filtrar usuários por categoria"
					items={buildItems(stats)}
					value={activeFilter}
					onValueChange={onFilterChange}
					className={cn("w-full", className)}
					countFloat={stats !== undefined}
				/>
			</div>

			{/* Mobile: botão + Sheet */}
			<div className="flex items-center gap-2 md:hidden">
				<Button
					variant="outline"
					size="sm"
					onClick={openSheet}
					aria-label="Abrir filtros"
				>
					<Filter className="mr-2 h-4 w-4" aria-hidden="true" />
					Filtros
				</Button>
				{activeFilter !== "all" && (
					<span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
						{FILTER_LABEL[activeFilter]}
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
							aria-label="Selecionar filtro de usuários"
							items={buildItems(stats)}
							value={pendingFilter}
							onValueChange={setPendingFilter}
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
