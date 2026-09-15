import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { InvalidOperatingHoursError } from "./errors/invalid-operating-hours-error.js"

export interface TimeIntervalDTO {
	open: string
	close: string
}

export interface DayScheduleDTO {
	weekday: number
	intervals: TimeIntervalDTO[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function parseTimeIntervals(input: unknown): TimeIntervalDTO[] | null {
	if (!Array.isArray(input)) return null

	const intervals: TimeIntervalDTO[] = []
	for (const interval of input) {
		if (
			!isRecord(interval) ||
			typeof interval.open !== "string" ||
			typeof interval.close !== "string"
		) {
			return null
		}
		intervals.push({ open: interval.open, close: interval.close })
	}
	return intervals
}

function parseDaySchedule(input: unknown): DayScheduleDTO | null {
	if (
		!isRecord(input) ||
		typeof input.weekday !== "number" ||
		!("intervals" in input)
	) {
		return null
	}
	const intervals = parseTimeIntervals(input.intervals)
	if (intervals === null) return null
	return { weekday: input.weekday, intervals }
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/

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

export class TimeInterval {
	private constructor(
		readonly open: string,
		readonly close: string,
	) {}

	static create(
		dto: TimeIntervalDTO,
	): Either<InvalidOperatingHoursError, TimeInterval> {
		if (!HH_MM.test(dto.open) || !HH_MM.test(dto.close)) {
			return failure(new InvalidOperatingHoursError("formato HH:mm inválido"))
		}
		if (dto.open >= dto.close) {
			return failure(new InvalidOperatingHoursError("open deve ser < close"))
		}
		return success(new TimeInterval(dto.open, dto.close))
	}

	static restore(dto: TimeIntervalDTO): TimeInterval {
		return new TimeInterval(dto.open, dto.close)
	}

	toJSON(): TimeIntervalDTO {
		return { open: this.open, close: this.close }
	}

	equals(other: TimeInterval): boolean {
		return this.open === other.open && this.close === other.close
	}
}

export class DaySchedule {
	private constructor(
		readonly weekday: number,
		readonly intervals: TimeInterval[],
	) {}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: yagni: validação de domínio exige branches, upgrade path extrair validadores se crescer
	static create(
		dto: DayScheduleDTO,
	): Either<InvalidOperatingHoursError, DaySchedule> {
		if (!Number.isInteger(dto.weekday) || dto.weekday < 0 || dto.weekday > 6) {
			return failure(
				new InvalidOperatingHoursError("weekday deve estar entre 0 e 6"),
			)
		}
		if (!Array.isArray(dto.intervals)) {
			return failure(
				new InvalidOperatingHoursError("intervals deve ser um array"),
			)
		}
		if (dto.intervals.length > 3) {
			return failure(
				new InvalidOperatingHoursError("máximo 3 intervalos por dia"),
			)
		}
		const intervalsOrError: TimeInterval[] = []
		for (const intervalDTO of dto.intervals) {
			const result = TimeInterval.create(intervalDTO)
			if (result.isFailure()) return failure(result.value)
			intervalsOrError.push(result.value)
		}
		intervalsOrError.sort((a, b) =>
			a.open < b.open ? -1 : a.open > b.open ? 1 : 0,
		)
		for (let i = 1; i < intervalsOrError.length; i++) {
			const prev = intervalsOrError[i - 1]
			const next = intervalsOrError[i]
			if (prev.close > next.open) {
				return failure(new InvalidOperatingHoursError("intervalos sobrepostos"))
			}
		}
		return success(new DaySchedule(dto.weekday, intervalsOrError))
	}

	static restore(dto: DayScheduleDTO): DaySchedule {
		const intervals = dto.intervals.map((i) => TimeInterval.restore(i))
		intervals.sort((a, b) => (a.open < b.open ? -1 : a.open > b.open ? 1 : 0))
		return new DaySchedule(dto.weekday, intervals)
	}

	toJSON(): DayScheduleDTO {
		return {
			weekday: this.weekday,
			intervals: this.intervals.map((i) => i.toJSON()),
		}
	}

	equals(other: DaySchedule): boolean {
		if (this.weekday !== other.weekday) return false
		if (this.intervals.length !== other.intervals.length) return false
		for (let i = 0; i < this.intervals.length; i++) {
			if (!this.intervals[i].equals(other.intervals[i])) return false
		}
		return true
	}
}

export class OperatingHours {
	private constructor(private readonly schedules: DaySchedule[]) {}

	static createFromUnknown(
		input: unknown,
	): Either<InvalidOperatingHoursError, OperatingHours> {
		if (!Array.isArray(input)) {
			return failure(
				new InvalidOperatingHoursError("operatingHours deve ser um array"),
			)
		}

		const schedules: DayScheduleDTO[] = []
		for (const day of input) {
			const schedule = parseDaySchedule(day)
			if (!schedule) {
				return failure(
					new InvalidOperatingHoursError(
						"operatingHours contém um dia inválido",
					),
				)
			}
			schedules.push(schedule)
		}

		return OperatingHours.create(schedules)
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: yagni: validação de domínio exige branches
	static create(
		dto: DayScheduleDTO[],
	): Either<InvalidOperatingHoursError, OperatingHours> {
		if (!Array.isArray(dto)) {
			return failure(
				new InvalidOperatingHoursError("operatingHours deve ser um array"),
			)
		}
		if (dto.length > 7) {
			return failure(new InvalidOperatingHoursError("máximo 7 DaySchedule"))
		}
		const seen = new Set<number>()
		const schedules: DaySchedule[] = []
		for (const dayDTO of dto) {
			if (seen.has(dayDTO.weekday)) {
				return failure(new InvalidOperatingHoursError("weekday duplicado"))
			}
			seen.add(dayDTO.weekday)
			const result = DaySchedule.create(dayDTO)
			if (result.isFailure()) return failure(result.value)
			schedules.push(result.value)
		}
		schedules.sort((a, b) => a.weekday - b.weekday)
		return success(new OperatingHours(schedules))
	}

	static restore(json: DayScheduleDTO[] | null): OperatingHours | null {
		if (!json) return null
		if (json.length === 0) return new OperatingHours([])
		const schedules = json.map((dto) => DaySchedule.restore(dto))
		schedules.sort((a, b) => a.weekday - b.weekday)
		return new OperatingHours(schedules)
	}

	toJSON(): DayScheduleDTO[] {
		return this.schedules.map((s) => s.toJSON())
	}

	equals(other: OperatingHours | null): boolean {
		if (other === null) return false
		if (this.schedules.length !== other.schedules.length) return false
		for (let i = 0; i < this.schedules.length; i++) {
			if (!this.schedules[i].equals(other.schedules[i])) return false
		}
		return true
	}

	isEmpty(): boolean {
		return this.schedules.length === 0
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: yagni: timezone conversion exige branches
	isOpenAt(date: Date, timeZone: string): boolean {
		if (this.isEmpty()) return false
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
		const schedule = this.schedules.find((s) => s.weekday === weekday)
		if (!schedule) return false
		for (const interval of schedule.intervals) {
			const openMin = parseMinutes(interval.open)
			const closeMin = parseMinutes(interval.close)
			if (currentMinutes >= openMin && currentMinutes < closeMin) return true
		}
		return false
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: yagni: agrupamento de dias exige branches
	toCompactString(): string {
		if (this.isEmpty()) return ""
		const signatureByWeekday = new Map<number, string | null>()
		for (const schedule of this.schedules) {
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
}
