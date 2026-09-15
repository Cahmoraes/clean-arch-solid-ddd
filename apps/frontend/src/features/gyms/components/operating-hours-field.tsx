// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: yagni field 7 rows
// biome-ignore-all lint/suspicious/noArrayIndexKey: yagni stable idx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { DayScheduleDTO } from "@/features/gyms/schemas/operating-hours-schema"

export interface OperatingHoursFieldProps {
	value: DayScheduleDTO[] | null | undefined
	onChange: (v: DayScheduleDTO[]) => void
	error?: string | null
	dayErrors?: Partial<Record<number, string>>
}

const WEEKDAYS = [
	"Domingo",
	"Segunda",
	"Terça",
	"Quarta",
	"Quinta",
	"Sexta",
	"Sábado",
] as const

function sortByWeekday(schedules: DayScheduleDTO[]): DayScheduleDTO[] {
	return [...schedules].sort((a, b) => a.weekday - b.weekday)
}

export function OperatingHoursField({
	value,
	onChange,
	error,
	dayErrors,
}: OperatingHoursFieldProps) {
	const schedules = value ?? []

	function getSchedule(weekday: number): DayScheduleDTO | undefined {
		return schedules.find((s) => s.weekday === weekday)
	}

	function handleToggleClosed(weekday: number, closed: boolean) {
		if (closed) {
			const next = schedules.filter((s) => s.weekday !== weekday)
			onChange(next.length === 0 ? [] : sortByWeekday(next))
		} else {
			const next: DayScheduleDTO = {
				weekday,
				intervals: [{ open: "08:00", close: "18:00" }],
			}
			onChange(sortByWeekday([...schedules, next]))
		}
	}

	function handleAddInterval(weekday: number) {
		const next = schedules.map((s) => {
			if (s.weekday !== weekday) return s
			if (s.intervals.length >= 3) return s
			return {
				...s,
				intervals: [...s.intervals, { open: "08:00", close: "18:00" }],
			}
		})
		onChange(sortByWeekday(next))
	}

	function handleRemoveInterval(weekday: number, index: number) {
		const next = schedules
			.map((s) =>
				s.weekday === weekday
					? { ...s, intervals: s.intervals.filter((_, i) => i !== index) }
					: s,
			)
			.filter((s) => s.intervals.length > 0)
		onChange(sortByWeekday(next))
	}

	function handleIntervalChange(
		weekday: number,
		index: number,
		field: "open" | "close",
		newValue: string,
	) {
		const next = schedules.map((s) => {
			if (s.weekday !== weekday) return s
			return {
				...s,
				intervals: s.intervals.map((interval, i) =>
					i === index ? { ...interval, [field]: newValue } : interval,
				),
			}
		})
		onChange(sortByWeekday(next))
	}

	return (
		<div className="space-y-2">
			{WEEKDAYS.map((label, weekday) => {
				const schedule = getSchedule(weekday)
				const isClosed = !schedule
				const intervals = schedule?.intervals ?? []
				const canAdd = intervals.length < 3
				const weekdayId = `operating-hours-${weekday}`
				const dayError = dayErrors?.[weekday] ?? null
				const dayErrorId = `${weekdayId}-error`

				return (
					<div
						key={weekday}
						data-testid={`day-row-${weekday}`}
						className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2"
					>
						<div className="flex items-center justify-between gap-3">
							<span className="min-w-20 text-sm font-medium text-foreground">
								{label}
							</span>
							<Label
								htmlFor={`${weekdayId}-closed`}
								className="flex cursor-pointer items-center gap-2 text-sm"
							>
								<input
									id={`${weekdayId}-closed`}
									type="checkbox"
									checked={isClosed}
									onChange={(e) =>
										handleToggleClosed(weekday, e.target.checked)
									}
									aria-label={`${label} Fechado`}
									aria-invalid={Boolean(dayError)}
									aria-describedby={dayError ? dayErrorId : undefined}
									className="h-4 w-4 rounded border-input accent-primary"
								/>
								Fechado
							</Label>
						</div>

						{!isClosed && (
							<div className="flex flex-col gap-2">
								{intervals.map((interval, idx) => (
									<div
										key={`${weekday}-${idx}`}
										className="flex items-center gap-2"
									>
										<Label
											htmlFor={`${weekdayId}-open-${idx}`}
											className="sr-only"
										>
											{`${label} abertura ${idx + 1}`}
										</Label>
										<Input
											id={`${weekdayId}-open-${idx}`}
											type="time"
											value={interval.open}
											onChange={(e) =>
												handleIntervalChange(
													weekday,
													idx,
													"open",
													e.target.value,
												)
											}
											aria-label={`${label} abertura ${idx + 1}`}
											aria-invalid={Boolean(dayError)}
											aria-describedby={dayError ? dayErrorId : undefined}
											className="h-9"
										/>
										<span className="text-sm text-muted-foreground">até</span>
										<Label
											htmlFor={`${weekdayId}-close-${idx}`}
											className="sr-only"
										>
											{`${label} fechamento ${idx + 1}`}
										</Label>
										<Input
											id={`${weekdayId}-close-${idx}`}
											type="time"
											value={interval.close}
											onChange={(e) =>
												handleIntervalChange(
													weekday,
													idx,
													"close",
													e.target.value,
												)
											}
											aria-label={`${label} fechamento ${idx + 1}`}
											aria-invalid={Boolean(dayError)}
											aria-describedby={dayError ? dayErrorId : undefined}
											className="h-9"
										/>
										{intervals.length > 1 && (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleRemoveInterval(weekday, idx)}
												aria-label={`Remover intervalo ${idx + 1} de ${label}`}
												className="shrink-0"
											>
												Remover
											</Button>
										)}
									</div>
								))}

								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={!canAdd}
										onClick={() => handleAddInterval(weekday)}
										aria-label={`Adicionar intervalo em ${label}`}
									>
										+ intervalo
									</Button>
									{!canAdd && (
										<span className="text-xs text-muted-foreground">
											Máximo 3 intervalos
										</span>
									)}
								</div>
							</div>
						)}

						{dayError ? (
							<p
								id={dayErrorId}
								role="alert"
								className="text-xs text-destructive"
							>
								{dayError}
							</p>
						) : null}
					</div>
				)
			})}

			{error ? (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
		</div>
	)
}
