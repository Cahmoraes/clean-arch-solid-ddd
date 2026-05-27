import { Button } from "@/components/ui/button"
import type { UserFilter, UserStats } from "../types"

const FILTERS: { label: string; value: UserFilter; ariaLabel: string }[] = [
	{ label: "Todos", value: "all", ariaLabel: "Todos" },
	{ label: "Membros", value: "member", ariaLabel: "Membros" },
	{ label: "Administradores", value: "admin", ariaLabel: "Administradores" },
	{ label: "Ativos", value: "active", ariaLabel: "Ativos" },
	{ label: "Inativos", value: "inactive", ariaLabel: "Inativos" },
]

function countForFilter(filter: UserFilter, counts: UserStats): number {
	switch (filter) {
		case "all":
			return counts.total
		case "member":
			return counts.members
		case "admin":
			return counts.admins
		case "active":
			return counts.active
		case "inactive":
			return counts.inactive
	}
}

export interface UserFilterBarProps {
	activeFilter: UserFilter
	counts: UserStats
	onFilterChange: (filter: UserFilter) => void
}

export function UserFilterBar({
	activeFilter,
	counts,
	onFilterChange,
}: UserFilterBarProps) {
	return (
		<fieldset
			className="flex w-full gap-2 border-0 p-0"
			aria-label="Filtrar usuários por categoria"
		>
			{FILTERS.map((filter) => (
				<Button
					key={filter.value}
					variant={activeFilter === filter.value ? "primary" : "outline"}
					size="sm"
					className="flex-1 rounded-md gap-1.5"
					onClick={() => onFilterChange(filter.value)}
					aria-pressed={activeFilter === filter.value}
					aria-label={filter.ariaLabel}
				>
					{filter.label}
					<span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
						{countForFilter(filter.value, counts)}
					</span>
				</Button>
			))}
		</fieldset>
	)
}
