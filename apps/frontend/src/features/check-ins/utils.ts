import type { CheckInFilterStatus } from "./hooks/use-check-in-filters.js"

export function totalCheckInPages(total: number, pageSize: number): number {
	if (total <= 0) return 0
	return Math.max(1, Math.ceil(total / pageSize))
}

export const CHECK_IN_STATUS_LABELS: Record<
	NonNullable<CheckInFilterStatus>,
	string
> = {
	pending: "pendente",
	validated: "aprovado",
	rejected: "rejeitado",
}
