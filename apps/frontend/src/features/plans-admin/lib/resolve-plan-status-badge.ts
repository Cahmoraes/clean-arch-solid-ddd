import type { PlanAdmin } from "@/features/plans-admin/api"

export function resolvePlanStatusBadge(plan: PlanAdmin) {
	return plan.isActive
		? { tone: "success" as const, label: "Ativo" }
		: { tone: "neutral" as const, label: "Inativo" }
}
