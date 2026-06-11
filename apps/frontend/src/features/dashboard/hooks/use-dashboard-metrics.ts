import type { CheckIn } from "@/features/check-ins/api"

export interface HeatmapDay {
	date: string
	count: number
	intensity: 0 | 1 | 2 | 3 | 4
}

export interface StatusDistribution {
	validated: number
	pending: number
	rejected: number
}

function toDateString(iso: string): string {
	return iso.slice(0, 10)
}

export function computeThisMonth(checkIns: CheckIn[]): number {
	const now = new Date()
	const year = now.getFullYear()
	const month = now.getMonth()
	return checkIns.filter((ci) => {
		const d = new Date(ci.createdAt)
		return d.getFullYear() === year && d.getMonth() === month
	}).length
}

export function computeStreak(checkIns: CheckIn[]): number {
	const validatedDays = new Set(
		checkIns
			.filter((ci) => ci.status === "validated")
			.map((ci) => toDateString(ci.createdAt)),
	)

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const todayStr = toDateString(today.toISOString())
	let cursor = validatedDays.has(todayStr)
		? today
		: new Date(today.getTime() - 86_400_000)

	let streak = 0
	while (true) {
		const dateStr = toDateString(cursor.toISOString())
		if (!validatedDays.has(dateStr)) break
		streak++
		cursor = new Date(cursor.getTime() - 86_400_000)
	}
	return streak
}

export function computeWeeklyFrequency(checkIns: CheckIn[]): number[] {
	const freq = [0, 0, 0, 0, 0, 0, 0]
	for (const ci of checkIns) {
		const day = new Date(ci.createdAt).getDay()
		freq[day]++
	}
	return freq
}

function toIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
	if (count === 0) return 0
	if (count === 1) return 1
	if (count === 2) return 2
	if (count === 3) return 3
	return 4
}

export function computeHeatmap(checkIns: CheckIn[]): HeatmapDay[] {
	const countByDate: Record<string, number> = {}
	for (const ci of checkIns) {
		const date = toDateString(ci.createdAt)
		countByDate[date] = (countByDate[date] ?? 0) + 1
	}

	const days: HeatmapDay[] = []
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	for (let i = 89; i >= 0; i--) {
		const d = new Date(today.getTime() - i * 86_400_000)
		const date = toDateString(d.toISOString())
		const count = countByDate[date] ?? 0
		days.push({ date, count, intensity: toIntensity(count) })
	}
	return days
}

const STATUS_KEYS = ["validated", "pending", "rejected"] as const

export function computeStatusDistribution(
	checkIns: CheckIn[],
): StatusDistribution {
	const counts: StatusDistribution = { validated: 0, pending: 0, rejected: 0 }
	for (const ci of checkIns) {
		if (STATUS_KEYS.includes(ci.status)) {
			counts[ci.status]++
		}
	}
	return counts
}
