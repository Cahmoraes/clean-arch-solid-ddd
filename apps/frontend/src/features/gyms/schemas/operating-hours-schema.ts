import { z } from "zod"

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/u

export const timeIntervalSchema = z
	.object({
		open: z.string().regex(HH_MM_REGEX, "Formato deve ser HH:mm"),
		close: z.string().regex(HH_MM_REGEX, "Formato deve ser HH:mm"),
	})
	.refine((val) => val.open < val.close, {
		message: "Horário de abertura deve ser antes do fechamento",
		path: ["close"],
	})

export const dayScheduleSchema = z
	.object({
		weekday: z
			.number()
			.int("weekday deve ser inteiro")
			.min(0, "weekday deve estar entre 0 e 6")
			.max(6, "weekday deve estar entre 0 e 6"),
		intervals: z
			.array(timeIntervalSchema)
			.max(3, "Máximo 3 intervalos por dia"),
	})
	.refine(
		(day) => {
			const sorted = [...day.intervals].sort((a, b) =>
				a.open.localeCompare(b.open),
			)
			for (let i = 1; i < sorted.length; i++) {
				if (sorted[i - 1].close > sorted[i].open) return false
			}
			return true
		},
		{ message: "Intervalos sobrepostos", path: ["intervals"] },
	)

export const operatingHoursSchema = z
	.array(dayScheduleSchema)
	.max(7, "Máximo 7 dias")
	.optional()
	.refine(
		(arr) => {
			if (!arr) return true
			return new Set(arr.map((d) => d.weekday)).size === arr.length
		},
		{ message: "weekday duplicado" },
	)

export type TimeIntervalDTO = z.infer<typeof timeIntervalSchema>
export type DayScheduleDTO = z.infer<typeof dayScheduleSchema>
export type OperatingHoursInput = z.infer<typeof operatingHoursSchema>
