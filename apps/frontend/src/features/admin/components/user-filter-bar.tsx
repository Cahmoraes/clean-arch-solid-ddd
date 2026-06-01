import {
	SegmentedControl,
	type SegmentedItem,
} from "@/components/ui/segmented-control"
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
	return (
		<SegmentedControl
			aria-label="Filtrar usuários por categoria"
			items={buildItems(stats)}
			value={activeFilter}
			onValueChange={onFilterChange}
			className={className}
			countFloat={stats !== undefined}
		/>
	)
}
