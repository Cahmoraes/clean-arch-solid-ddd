import type { Dispatch, SetStateAction } from "react"
import type { ZodIssue } from "zod"
import type { DayScheduleDTO } from "@/features/gyms/schemas/operating-hours-schema"
import { operatingHoursSchema } from "@/features/gyms/schemas/operating-hours-schema"

export interface OperatingHoursValidationResult {
	success: boolean
	value: DayScheduleDTO[] | null
	error: string | null
	dayErrors: Partial<Record<number, string>>
}

export function updateOperatingHoursFieldValue(
	next: DayScheduleDTO[],
	setOperatingHours: Dispatch<SetStateAction<DayScheduleDTO[] | null>>,
	setOperatingHoursError: Dispatch<SetStateAction<string | null>>,
	setOperatingHoursDayErrors: Dispatch<
		SetStateAction<Partial<Record<number, string>>>
	>,
) {
	setOperatingHours(next.length === 0 ? null : next)
	setOperatingHoursError(null)
	setOperatingHoursDayErrors({})
}

function getDayIndex(path: PropertyKey[]): number | null {
	const [index] = path
	if (typeof index !== "number" || index < 0 || index > 6) return null
	return index
}

function getWeekdayAtIndex(
	value: DayScheduleDTO[] | null | undefined,
	index: number,
): number | null {
	const schedule = value?.[index]
	if (!schedule) return null
	return schedule.weekday
}

function collectDayErrors(
	value: DayScheduleDTO[] | null | undefined,
	issues: ZodIssue[],
): Partial<Record<number, string>> {
	const dayErrors: Partial<Record<number, string>> = {}

	for (const issue of issues) {
		const dayIndex = getDayIndex(issue.path)
		if (dayIndex === null) continue

		const weekday = getWeekdayAtIndex(value, dayIndex)
		if (weekday === null) continue

		dayErrors[weekday] ??= issue.message
	}

	return dayErrors
}

function collectGlobalError(
	issues: ZodIssue[],
): string | null {
	return (
		issues.find((issue) => getDayIndex(issue.path) === null)?.message ?? null
	)
}

export function validateOperatingHoursInput(
	value: DayScheduleDTO[] | null | undefined,
): OperatingHoursValidationResult {
	const parsed = operatingHoursSchema.safeParse(value ?? undefined)
	if (parsed.success) {
		return {
			success: true,
			value: parsed.data ?? null,
			error: null,
			dayErrors: {},
		}
	}

	const dayErrors = collectDayErrors(value, parsed.error.issues)
	const error = collectGlobalError(parsed.error.issues)

	return {
		success: false,
		value: null,
		error: error ?? parsed.error.issues[0]?.message ?? "Horário inválido",
		dayErrors,
	}
}
