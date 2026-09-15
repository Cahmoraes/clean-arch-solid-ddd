import type { GymSummary } from "@/features/gyms/api"

export function resolveLocation(gym: GymSummary): string {
	if (gym.address) return gym.address
	return `${gym.latitude.toFixed(4)}, ${gym.longitude.toFixed(4)}`
}
