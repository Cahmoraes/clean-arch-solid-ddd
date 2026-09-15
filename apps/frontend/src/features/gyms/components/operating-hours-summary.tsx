"use client"

import { Clock } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useIsGymOpen } from "@/features/gyms/hooks/use-is-gym-open"
import { toCompactString } from "@/features/gyms/lib/operating-hours"
import type { DayScheduleDTO } from "@/features/gyms/schemas/operating-hours-schema"

const WEEKDAY_FULL = [
	"Domingo",
	"Segunda",
	"Terça",
	"Quarta",
	"Quinta",
	"Sexta",
	"Sábado",
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

function getTodayWeekday(date: Date, timeZone: string): number | null {
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			weekday: "short",
		}).formatToParts(date)
		const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? ""
		const weekday = WEEKDAY_MAP[weekdayStr]
		return weekday ?? null
	} catch {
		return null
	}
}

function formatIntervals(intervals: { open: string; close: string }[]): string {
	if (intervals.length === 0) return "Fechado"
	return intervals.map((i) => `${i.open} – ${i.close}`).join(", ")
}

function WeekRow({
	weekday,
	isToday,
	intervals,
}: {
	weekday: number
	isToday: boolean
	intervals: { open: string; close: string }[]
}) {
	const display = formatIntervals(intervals)
	const isClosed = intervals.length === 0
	return (
		<tr
			data-testid={`operating-hours-row-${weekday}`}
			className={`border-[#ecece6] border-b last:border-0 ${isToday ? "bg-[rgba(57,229,140,.10)]" : ""}`}
		>
			<td
				className={`px-2.5 py-1.5 ${isToday ? "font-medium text-[#0a7a3a]" : ""}`}
			>
				{WEEKDAY_FULL[weekday]}
			</td>
			<td
				className={`px-2.5 py-1.5 text-right ${isClosed ? "text-[#b0b0a6] italic" : "text-muted-foreground"}`}
			>
				{display}
			</td>
		</tr>
	)
}

export interface OperatingHoursSummaryProps {
	operatingHours: DayScheduleDTO[] | null | undefined
	now?: Date
	timeZone?: string
}

function millisecondsUntilNextMinute(): number {
	const now = new Date()
	return 60_000 - (now.getSeconds() * 1_000 + now.getMilliseconds())
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: yagni layout C exige branches
export function OperatingHoursSummary({
	operatingHours,
	now,
	timeZone = "America/Sao_Paulo",
}: OperatingHoursSummaryProps) {
	const [currentTime, setCurrentTime] = useState(() => new Date())

	useEffect(() => {
		if (now) return

		const updateCurrentTime = () => setCurrentTime(new Date())
		updateCurrentTime()

		let intervalId: number | undefined
		const timeoutId = window.setTimeout(() => {
			updateCurrentTime()
			intervalId = window.setInterval(updateCurrentTime, 60_000)
		}, millisecondsUntilNextMinute())

		return () => {
			window.clearTimeout(timeoutId)
			if (intervalId !== undefined) window.clearInterval(intervalId)
		}
	}, [now])

	const effectiveNow = now ?? currentTime
	const { isOpen, closesAt, opensAt } = useIsGymOpen(
		operatingHours,
		effectiveNow,
		timeZone,
	)
	const compact = useMemo(
		() => toCompactString(operatingHours),
		[operatingHours],
	)
	const todayWeekday = useMemo(
		() => getTodayWeekday(effectiveNow, timeZone),
		[effectiveNow, timeZone],
	)

	const scheduleByWeekday = useMemo(() => {
		const map = new Map<number, DayScheduleDTO>()
		if (operatingHours) {
			for (const s of operatingHours) map.set(s.weekday, s)
		}
		return map
	}, [operatingHours])

	if (!operatingHours || operatingHours.length === 0) {
		return (
			<div
				data-testid="operating-hours-empty"
				className="mt-3 rounded-[10px] border border-dashed border-border p-2.5 text-xs text-muted-foreground"
			>
				Horário não informado
			</div>
		)
	}

	const badgeTime = isOpen ? closesAt : opensAt
	const badgeLabel = isOpen
		? closesAt
			? `Fecha às ${closesAt}`
			: null
		: opensAt
			? `Abre às ${opensAt}`
			: null

	return (
		<div
			data-testid="operating-hours-summary"
			className="mt-3 overflow-hidden rounded-[10px] border border-border bg-[#fcfcf9]"
		>
			<div className="flex items-center gap-1.5 border-border border-b px-2.5 py-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-[.05em]">
				<Clock className="h-3.5 w-3.5" aria-hidden="true" />
				Horário de funcionamento
			</div>

			<div className="flex items-center justify-between px-2.5 py-2">
				<span
					data-testid="operating-hours-badge"
					aria-live="polite"
					className={`font-semibold text-xs ${isOpen ? "text-[#0a7a3a]" : "text-[#b42318]"}`}
				>
					{isOpen ? "● Aberto agora" : "● Fechado"}
				</span>
				{badgeLabel ? (
					<span
						data-testid="operating-hours-badge-time"
						className={`rounded-full border px-2 py-1 font-bold text-[11px] ${isOpen ? "border-[#b6e8c8] bg-[#e6f9ee] text-[#0a7a3a]" : "border-[#ffd0cc] bg-[#fff1f0] text-[#b42318]"}`}
					>
						{badgeLabel}
					</span>
				) : null}
				{/* also expose closesAt/opensAt for generic selector */}
				{badgeTime ? <span className="sr-only">{badgeTime}</span> : null}
			</div>

			<div
				data-testid="operating-hours-compact"
				className="px-2.5 pb-1 text-xs leading-5"
			>
				{compact}
			</div>

			<details className="border-border border-t">
				<summary className="flex cursor-pointer justify-center py-1.5 text-[11px] text-muted-foreground">
					Ver horários completos ▾
				</summary>
				<table className="w-full text-xs">
					<caption className="sr-only">Horário semanal</caption>
					<tbody>
						{[0, 1, 2, 3, 4, 5, 6].map((weekday) => {
							const schedule = scheduleByWeekday.get(weekday)
							const isToday = weekday === todayWeekday
							const intervals = schedule?.intervals ?? []
							return (
								<WeekRow
									key={weekday}
									weekday={weekday}
									isToday={isToday}
									intervals={intervals}
								/>
							)
						})}
					</tbody>
				</table>
			</details>
		</div>
	)
}
