import type { Gym } from "@/features/gyms/api"

export function resolveGymStatusBadge(gym: Gym, adminEditHref?: string) {
	const isDeactivated = adminEditHref && gym.status === "deactivated"
	return isDeactivated
		? { tone: "danger" as const, label: "Desativada" }
		: { tone: "success" as const, label: "Disponível" }
}
