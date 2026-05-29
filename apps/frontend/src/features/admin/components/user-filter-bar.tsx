import {
	SegmentedControl,
	type SegmentedItem,
} from "@/components/ui/segmented-control"
import type { UserFilter, UserStats } from "../types"

function buildItems(
	counts: UserStats,
): ReadonlyArray<SegmentedItem<UserFilter>> {
	return [
		{ value: "all", label: "Todos", count: counts.total },
		{ value: "member", label: "Membros", count: counts.members },
		{ value: "admin", label: "Administradores", count: counts.admins },
		{ value: "active", label: "Ativos", count: counts.active },
		{ value: "inactive", label: "Inativos", count: counts.inactive },
	]
}

export interface UserFilterBarProps {
	activeFilter: UserFilter
	counts: UserStats
	onFilterChange: (filter: UserFilter) => void
	className?: string
}

export function UserFilterBar({
	activeFilter,
	counts,
	onFilterChange,
	className,
}: UserFilterBarProps) {
	return (
		<SegmentedControl
			aria-label="Filtrar usuários por categoria"
			items={buildItems(counts)}
			value={activeFilter}
			onValueChange={onFilterChange}
			className={className}
		/>
	)
}
