import type { DayScheduleDTO } from "@/features/gyms/schemas/operating-hours-schema"

const WEEKDAY_LABELS = [
	"Dom",
	"Seg",
	"Ter",
	"Qua",
	"Qui",
	"Sex",
	"Sáb",
] as const

const WEEKDAY_MAP: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
}

function parseMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(":").map(Number)
	return h * 60 + m
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: yagni: agrupamento exige branches
export function toCompactString(
	hours: DayScheduleDTO[] | null | undefined,
): string {
	if (!hours || hours.length === 0) return ""
	const signatureByWeekday = new Map<number, string | null>()
	for (const schedule of hours) {
		if (schedule.intervals.length === 0) {
			signatureByWeekday.set(schedule.weekday, null)
		} else {
			const sig = schedule.intervals
				.map((i) => `${i.open}–${i.close}`)
				.join(", ")
			signatureByWeekday.set(schedule.weekday, sig)
		}
	}
	const signatures: (string | null)[] = []
	for (let w = 0; w < 7; w++) {
		signatures.push(
			signatureByWeekday.has(w) ? (signatureByWeekday.get(w) ?? null) : null,
		)
	}
	type Group = { start: number; end: number; sig: string | null }
	const groups: Group[] = []
	let start = 0
	let currentSig = signatures[0]
	for (let i = 1; i < 7; i++) {
		if (signatures[i] === currentSig) continue
		groups.push({ start, end: i - 1, sig: currentSig })
		start = i
		currentSig = signatures[i]
	}
	groups.push({ start, end: 6, sig: currentSig })
	const parts = groups.map((g) => {
		const label =
			g.start === g.end
				? WEEKDAY_LABELS[g.start]
				: `${WEEKDAY_LABELS[g.start]}–${WEEKDAY_LABELS[g.end]}`
		if (g.sig === null) return `${label} fechado`
		return `${label} ${g.sig}`
	})
	return parts.join(" · ")
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: yagni: timezone conversion exige branches
export function isOpenAt(
	hours: DayScheduleDTO[] | null | undefined,
	date: Date,
	timeZone = "America/Sao_Paulo",
): boolean {
	if (!hours || hours.length === 0) return false
	let parts: Intl.DateTimeFormatPart[]
	try {
		parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			weekday: "short",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).formatToParts(date)
	} catch {
		return false
	}
	const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? ""
	const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0"
	const minuteStr = parts.find((p) => p.type === "minute")?.value ?? "0"
	const weekday = WEEKDAY_MAP[weekdayStr]
	if (weekday === undefined) return false
	let hour = Number.parseInt(hourStr, 10)
	const minute = Number.parseInt(minuteStr, 10)
	if (hour === 24) hour = 0
	const currentMinutes = hour * 60 + minute
	const schedule = hours.find((s) => s.weekday === weekday)
	if (!schedule) return false
	for (const interval of schedule.intervals) {
		const openMin = parseMinutes(interval.open)
		const closeMin = parseMinutes(interval.close)
		if (currentMinutes >= openMin && currentMinutes < closeMin) return true
	}
	return false
}
