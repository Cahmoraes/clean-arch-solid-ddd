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
	/** Dia selecionado (`YYYY-MM-DD`); quando informado, cada dia expõe `aria-pressed`. */
	selectedDate?: string
}

// Anel duplo ciano do dia selecionado, distinto do anel de foco de teclado.
const SELECTED_RING_CLASS =
	"shadow-[0_0_0_2px_var(--color-background),0_0_0_4px_var(--color-accent)]"

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

function getSelectedRingClass(isSelected: boolean | undefined): string {
	return isSelected ? SELECTED_RING_CLASS : ""
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

function MarcadoresDoDia({
	dateStr,
	temFeriado,
	temNota,
}: {
	dateStr: string
	temFeriado: boolean
	temNota: boolean
}) {
	if (!temFeriado && !temNota) return null
	return (
		<span aria-hidden="true" className="flex h-2.5 items-center gap-2">
			{temFeriado ? (
				<span
					data-testid={`marcador-feriado-${dateStr}`}
					className="size-2 bg-warning"
				/>
			) : null}
			{temNota ? (
				<span
					data-testid={`marcador-nota-${dateStr}`}
					className="size-2 rotate-45 bg-accent"
				/>
			) : null}
		</span>
	)
}

function ConteudoDoTooltip({
	holiday,
	notaTexto,
}: {
	holiday?: Feriado
	notaTexto?: string
}) {
	return (
		<div className="max-w-64 space-y-1 break-words leading-tight">
			{holiday ? <p>{holiday.name}</p> : null}
			{notaTexto ? <p>{notaTexto}</p> : null}
		</div>
	)
}

function DayCell({
	day,
	dateStr,
	holiday,
	notaTexto,
	isToday,
	isSelected,
	monthNameLower,
	onSelectDay,
}: {
	day: number
	dateStr: string
	holiday?: Feriado
	notaTexto?: string
	isToday: boolean
	/** `undefined` quando a grade não controla seleção (sem `aria-pressed`). */
	isSelected?: boolean
	monthNameLower: string
	onSelectDay?: (date: string) => void
}) {
	const cell = (
		<button
			type="button"
			data-date={dateStr}
			aria-current={isToday ? "date" : undefined}
			aria-pressed={isSelected}
			aria-label={formatDayAriaLabel(day, monthNameLower, holiday, notaTexto)}
			onClick={() => onSelectDay?.(dateStr)}
			className={cn(
				"flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-1 text-sm focus-ring-duplo",
				getDayCellStateClass(Boolean(holiday), isToday),
				getSelectedRingClass(isSelected),
			)}
		>
			<span className="block font-display text-lg leading-none">{day}</span>
			<MarcadoresDoDia
				dateStr={dateStr}
				temFeriado={Boolean(holiday)}
				temNota={Boolean(notaTexto)}
			/>
		</button>
	)

	// Árvore estável: a nota/feriado chegam depois (queries independentes) e
	// trocar a estrutura remontaria o botão, perdendo foco e clique em curso.
	const temConteudo = Boolean(holiday || notaTexto)

	return (
		<Tooltip open={temConteudo ? undefined : false}>
			<TooltipTrigger asChild>{cell}</TooltipTrigger>
			{temConteudo ? (
				<TooltipContent>
					<ConteudoDoTooltip holiday={holiday} notaTexto={notaTexto} />
				</TooltipContent>
			) : null}
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
	selectedDate: string | undefined,
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
				isSelected={
					selectedDate === undefined ? undefined : dateStr === selectedDate
				}
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
	selectedDate,
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
						selectedDate,
					)}
				</div>
			</CardContent>
		</Card>
	)
}
