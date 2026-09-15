import type { GymSummary } from "@/features/gyms/api"

export function resolveGymStatusBadge(gym: GymSummary, adminEditHref?: string) {
	const isDeactivated = adminEditHref && gym.status === "deactivated"
	return isDeactivated
		? { tone: "danger" as const, label: "Desativada" }
		: { tone: "success" as const, label: "Disponível" }
}
