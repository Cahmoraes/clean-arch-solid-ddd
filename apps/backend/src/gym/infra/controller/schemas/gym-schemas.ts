import { z } from "zod"

export const timeIntervalSchema = z
	.object({
		open: z
			.string()
			.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "formato HH:mm inválido")
			.meta({ description: "Horário de abertura HH:mm", example: "08:00" }),
		close: z
			.string()
			.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "formato HH:mm inválido")
			.meta({ description: "Horário de fechamento HH:mm", example: "18:00" }),
	})
	.refine((v) => v.open < v.close, { message: "open deve ser < close" })

export const dayScheduleSchema = z
	.object({
		weekday: z
			.number()
			.int()
			.min(0)
			.max(6)
			.meta({ description: "Dia da semana 0=Dom … 6=Sáb", example: 1 }),
		intervals: z
			.array(timeIntervalSchema)
			.max(3, "máximo 3 intervalos por dia")
			.meta({ description: "Intervalos do dia" }),
	})
	.refine(
		(d) => {
			const sorted = [...d.intervals].sort((a, b) =>
				a.open.localeCompare(b.open),
			)
			for (let i = 1; i < sorted.length; i++) {
				if (sorted[i - 1].close > sorted[i].open) return false
			}
			return true
		},
		{ message: "intervalos sobrepostos" },
	)

export const operatingHoursSchema = z
	.array(dayScheduleSchema)
	.max(7, "máximo 7 DaySchedule")
	.optional()
	.refine(
		(arr) => !arr || new Set(arr.map((d) => d.weekday)).size === arr.length,
		{ message: "weekday duplicado" },
	)
	.meta({ description: "Horários de funcionamento semanal" })

export const operatingHoursNullableSchema = operatingHoursSchema
	.nullable()
	.meta({ description: "Horários de funcionamento semanal ou null" })

export const gymOperatingHoursResponseSchema = z
	.array(dayScheduleSchema)
	.nullable()
	.meta({
		description: "Horários de funcionamento ou null quando não informado",
	})
