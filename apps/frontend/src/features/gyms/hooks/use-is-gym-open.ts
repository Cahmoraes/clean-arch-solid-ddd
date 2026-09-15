"use client"

import { useMemo } from "react"
import type { DayScheduleDTO } from "@/features/gyms/schemas/operating-hours-schema"

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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: yagni: timezone parse exige branches
function getTimeParts(
	date: Date,
	timeZone: string,
): { weekday: number; minutes: number } | null {
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
		return null
	}
	const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? ""
	const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0"
	const minuteStr = parts.find((p) => p.type === "minute")?.value ?? "0"
	const weekday = WEEKDAY_MAP[weekdayStr]
	if (weekday === undefined) return null
	let hour = Number.parseInt(hourStr, 10)
	const minute = Number.parseInt(minuteStr, 10)
	if (hour === 24) hour = 0
	const minutes = hour * 60 + minute
	return { weekday, minutes }
}

export interface UseIsGymOpenResult {
	isOpen: boolean
	closesAt: string | null
	opensAt: string | null
}

/**
 * Calcula se academia está aberta agora em `timeZone` fixo.
 * Retorna `isOpen`, `closesAt` (se aberto) e `opensAt` (se fechado).
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: yagni: cálculo isOpen com lookup de próximos dias
function computeOpenStatus(
	operatingHours: DayScheduleDTO[] | null | undefined,
	now: Date,
	timeZone: string,
): UseIsGymOpenResult {
	if (!operatingHours || operatingHours.length === 0) {
		return { isOpen: false, closesAt: null, opensAt: null }
	}
	const parts = getTimeParts(now, timeZone)
	if (!parts) return { isOpen: false, closesAt: null, opensAt: null }
	const { weekday, minutes } = parts
	const schedule = operatingHours.find((s) => s.weekday === weekday)

	if (schedule) {
		const sorted = [...schedule.intervals].sort((a, b) =>
			a.open.localeCompare(b.open),
		)
		for (const interval of sorted) {
			const openMin = parseMinutes(interval.open)
			const closeMin = parseMinutes(interval.close)
			if (minutes >= openMin && minutes < closeMin) {
				return { isOpen: true, closesAt: interval.close, opensAt: null }
			}
		}
		for (const interval of sorted) {
			const openMin = parseMinutes(interval.open)
			if (minutes < openMin) {
				return { isOpen: false, closesAt: null, opensAt: interval.open }
			}
		}
	}

	for (let offset = 1; offset <= 7; offset++) {
		const nextWeekday = (weekday + offset) % 7
		const nextSchedule = operatingHours.find((s) => s.weekday === nextWeekday)
		if (nextSchedule && nextSchedule.intervals.length > 0) {
			const sorted = [...nextSchedule.intervals].sort((a, b) =>
				a.open.localeCompare(b.open),
			)
			return { isOpen: false, closesAt: null, opensAt: sorted[0].open }
		}
	}

	return { isOpen: false, closesAt: null, opensAt: null }
}

export function useIsGymOpen(
	operatingHours: DayScheduleDTO[] | null | undefined,
	now: Date = new Date(),
	timeZone = "America/Sao_Paulo",
): UseIsGymOpenResult {
	return useMemo(
		() => computeOpenStatus(operatingHours, now, timeZone),
		[operatingHours, now, timeZone],
	)
}
