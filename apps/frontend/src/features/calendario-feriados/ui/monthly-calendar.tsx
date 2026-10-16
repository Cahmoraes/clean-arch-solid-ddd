"use client"

import type { RefObject } from "react"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { getMonthLabel } from "@/features/calendario-feriados/hooks/use-calendar-navigation"
import type { Feriado } from "@/features/calendario-feriados/model/feriado"
import { cn } from "@/lib/cn"

const WEEKDAY_LABELS = [
	"Dom",
	"Seg",
	"Ter",
	"Qua",
	"Qui",
	"Sex",
	"Sáb",
] as const

const MONTH_NAMES_LOWER = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
] as const

export interface MonthlyCalendarProps {
	monthIndex: number
	year: number
	feriados: Feriado[]
	onPrevMonth: () => void
	onNextMonth: () => void
	prevBtnRef?: RefObject<HTMLButtonElement | null>
	nextBtnRef?: RefObject<HTMLButtonElement | null>
	/**
	 * Notas do mês exibido (data `YYYY-MM-DD` → texto). Quando ausente, a
	 * célula renderiza só feriado/hoje, como antes.
	 */
	notas?: Readonly<Record<string, string>>
	onSelectDay?: (date: string) => void
}

function getDaysInMonth(year: number, monthIndex: number): number {
	return new Date(year, monthIndex + 1, 0).getDate()
}

function formatHolidayAriaLabel(holiday: Feriado): string {
	const monthNum = Number(holiday.date.slice(5, 7))
	const dayNum = Number(holiday.date.slice(8, 10))
	const yearNum = Number(holiday.date.slice(0, 4))
	const monthName = MONTH_NAMES_LOWER[monthNum - 1] ?? ""
	return `${dayNum} de ${monthName}: ${holiday.name}, feriado nacional de ${yearNum}`
}

function getTodayDateStr(): string {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function getDayCellStateClass(isHoliday: boolean, isToday: boolean): string {
	if (isToday) return "border-primary bg-primary/10"
	if (isHoliday) return "border-warning bg-warning/10"
	return "border-transparent"
}

function formatDayAriaLabel(
	day: number,
	monthNameLower: string,
	holiday: Feriado | undefined,
	notaTexto: string | undefined,
): string {
	const base = holiday
		? formatHolidayAriaLabel(holiday)
		: `${day} de ${monthNameLower}`
	if (!notaTexto) return base
	return `${base}, nota: ${notaTexto}`
}

function DayCell({
	day,
	dateStr,
	holiday,
	notaTexto,
	isToday,
	monthNameLower,
	onSelectDay,
}: {
	day: number
	dateStr: string
	holiday?: Feriado
	notaTexto?: string
	isToday: boolean
	monthNameLower: string
	onSelectDay?: (date: string) => void
}) {
	const cell = (
		<button
			type="button"
			data-date={dateStr}
			aria-current={isToday ? "date" : undefined}
			aria-label={formatDayAriaLabel(day, monthNameLower, holiday, notaTexto)}
			onClick={() => onSelectDay?.(dateStr)}
			className={cn(
				"relative flex min-h-14 w-full cursor-pointer flex-col items-center justify-center rounded-md border p-1 text-sm focus-ring-duplo",
				getDayCellStateClass(Boolean(holiday), isToday),
			)}
		>
			<span className="block font-display text-lg leading-none">{day}</span>
			{holiday ? (
				<span
					className="mt-1 line-clamp-2 block font-sans text-center text-[10px] font-medium leading-tight"
					data-name={holiday.name}
				>
					{holiday.name}
				</span>
			) : null}
			{notaTexto ? (
				<>
					<span
						aria-hidden="true"
						data-testid={`nota-dot-${dateStr}`}
						className="absolute right-1 top-1 size-2 rotate-45 bg-accent"
					/>
					<span
						data-testid={`nota-bar-${dateStr}`}
						className="mt-1 block w-full truncate rounded-md bg-accent px-1 text-center font-sans text-[10px] font-medium leading-tight text-accent-foreground"
					>
						{notaTexto}
					</span>
				</>
			) : null}
		</button>
	)

	if (!holiday) return cell

	return (
		<Tooltip>
			<TooltipTrigger asChild>{cell}</TooltipTrigger>
			<TooltipContent>{holiday.name}</TooltipContent>
		</Tooltip>
	)
}

function renderDayCells(
	year: number,
	monthIndex: number,
	holidaysByDate: Map<string, Feriado>,
	monthNameLower: string,
	notas: Readonly<Record<string, string>>,
	onSelectDay: ((date: string) => void) | undefined,
) {
	const daysInMonth = getDaysInMonth(year, monthIndex)
	const todayStr = getTodayDateStr()
	return Array.from({ length: daysInMonth }, (_, index) => {
		const day = index + 1
		const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
		const holiday = holidaysByDate.get(dateStr)
		return (
			<DayCell
				key={dateStr}
				day={day}
				dateStr={dateStr}
				holiday={holiday}
				notaTexto={notas[dateStr]}
				isToday={dateStr === todayStr}
				monthNameLower={monthNameLower}
				onSelectDay={onSelectDay}
			/>
		)
	})
}

function getPrevLabel(monthIndex: number, year: number): string {
	if (monthIndex === 0) return `Mês anterior, dezembro ${year - 1}`
	return `Mês anterior, ${getMonthLabel(monthIndex - 1, year).toLowerCase()}`
}

function getNextLabel(monthIndex: number, year: number): string {
	if (monthIndex === 11) return `Próximo mês, janeiro ${year + 1}`
	return `Próximo mês, ${getMonthLabel(monthIndex + 1, year).toLowerCase()}`
}

export function MonthlyCalendar({
	monthIndex,
	year,
	feriados,
	onPrevMonth,
	onNextMonth,
	prevBtnRef,
	nextBtnRef,
	notas = {},
	onSelectDay,
}: MonthlyCalendarProps) {
	const prevLabel = getPrevLabel(monthIndex, year)
	const nextLabel = getNextLabel(monthIndex, year)

	const holidaysByDate = new Map(feriados.map((h) => [h.date, h] as const))
	const firstWeekday = new Date(year, monthIndex, 1).getDay()
	const monthNameLower = MONTH_NAMES_LOWER[monthIndex] ?? ""

	return (
		<Card className="rounded-xl transition-[transform,opacity] duration-[180ms] motion-reduce:transition-none">
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle as="h2" aria-live="polite">
						{getMonthLabel(monthIndex, year)}
					</CardTitle>
					<CardDescription>{feriados.length} feriado(s) no mês</CardDescription>
				</div>
				<div className="flex items-center gap-2">
					<Button
						ref={prevBtnRef}
						variant="outline"
						size="icon"
						aria-label={prevLabel}
						onClick={onPrevMonth}
					>
						‹
					</Button>
					<Button
						ref={nextBtnRef}
						variant="outline"
						size="icon"
						aria-label={nextLabel}
						onClick={onNextMonth}
					>
						›
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div
					className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground"
					aria-hidden="true"
				>
					{WEEKDAY_LABELS.map((w) => (
						<span key={w}>{w}</span>
					))}
				</div>
				{/* biome-ignore lint/a11y/useSemanticElements: grid semantics required for calendário acessível */}
				<div role="grid" className="mt-2 grid grid-cols-7 gap-1">
					{Array.from({ length: firstWeekday }).map((_, index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: empty offsets never reorder
							key={`empty-${index}`}
							aria-hidden="true"
							className="min-h-10"
						/>
					))}
					{renderDayCells(
						year,
						monthIndex,
						holidaysByDate,
						monthNameLower,
						notas,
						onSelectDay,
					)}
				</div>
			</CardContent>
		</Card>
	)
}
