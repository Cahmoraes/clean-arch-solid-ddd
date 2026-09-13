"use client"

import { ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react"
import { useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useFeriadosQuery } from "@/features/calendario-feriados/api/use-feriados-query"
import type { Feriado } from "@/features/calendario-feriados/model/feriado"
import { cn } from "@/lib/cn"

type CalendarPageProps = {
	initialYear?: number
}

type CalendarDay = {
	date: string
	day: number
	holiday?: Feriado
}

type CalendarMonth = {
	index: number
	name: string
	days: CalendarDay[]
}

const MONTH_NAMES = [
	"Janeiro",
	"Fevereiro",
	"Março",
	"Abril",
	"Maio",
	"Junho",
	"Julho",
	"Agosto",
	"Setembro",
	"Outubro",
	"Novembro",
	"Dezembro",
] as const

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const CALENDAR_SKELETON_MONTHS = ["sk-1", "sk-2", "sk-3", "sk-4"]

function formatDateParts(
	year: number,
	monthIndex: number,
	day: number,
): string {
	return [
		String(year),
		String(monthIndex + 1).padStart(2, "0"),
		String(day).padStart(2, "0"),
	].join("-")
}

function getDaysInMonth(year: number, monthIndex: number): number {
	return new Date(year, monthIndex + 1, 0).getDate()
}

function compareHolidayDate(a: Feriado, b: Feriado): number {
	return a.date.localeCompare(b.date)
}

function buildCalendarMonths(
	year: number,
	holidays: ReadonlyArray<Feriado>,
): CalendarMonth[] {
	const holidaysByDate = new Map(
		holidays.map((holiday) => [holiday.date, holiday] as const),
	)

	return MONTH_NAMES.map((name, monthIndex) => {
		const days = Array.from(
			{ length: getDaysInMonth(year, monthIndex) },
			(_, index) => {
				const day = index + 1
				const date = formatDateParts(year, monthIndex, day)
				return { date, day, holiday: holidaysByDate.get(date) }
			},
		)
		return { index: monthIndex, name, days }
	})
}

function formatReadableDate(date: string): string {
	const [year, month, day] = date.split("-")
	return `${day}/${month}/${year}`
}

function formatHolidayAriaLabel(holiday: Feriado): string {
	const [year, month, day] = holiday.date.split("-").map(Number)
	const monthName = MONTH_NAMES[month - 1]?.toLowerCase() ?? ""
	return `${day} de ${monthName}: ${holiday.name}, feriado nacional de ${year}`
}

function YearNavigation({
	selectedYear,
	onPreviousYear,
	onNextYear,
}: {
	selectedYear: number
	onPreviousYear: () => void
	onNextYear: () => void
}) {
	return (
		<nav
			aria-label="Navegação de anos"
			className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
		>
			<Button
				type="button"
				variant="outline"
				size="sm"
				aria-label={`Ir para ${selectedYear - 1} (ano anterior)`}
				onClick={onPreviousYear}
				className="w-full sm:w-auto"
			>
				<ChevronLeft aria-hidden="true" className="size-4" />
				{selectedYear - 1}
			</Button>
			<span className="rounded-full border border-border bg-card px-4 py-2 text-center font-mono text-sm font-semibold text-foreground">
				{selectedYear}
			</span>
			<Button
				type="button"
				variant="outline"
				size="sm"
				aria-label={`Ir para ${selectedYear + 1} (ano seguinte)`}
				onClick={onNextYear}
				className="w-full sm:w-auto"
			>
				{selectedYear + 1}
				<ChevronRight aria-hidden="true" className="size-4" />
			</Button>
		</nav>
	)
}

function CalendarLoadingState() {
	return (
		<div role="status" aria-live="polite" className="flex flex-col gap-4">
			<span className="sr-only">Carregando feriados</span>
			<div className="grid gap-4 md:grid-cols-2">
				{CALENDAR_SKELETON_MONTHS.map((key) => (
					<Skeleton key={key} className="h-56 w-full rounded-[22px]" />
				))}
			</div>
		</div>
	)
}

function CalendarErrorState({
	errorMessage,
	onRetry,
}: {
	errorMessage?: string
	onRetry: () => void
}) {
	return (
		<div
			role="alert"
			className="flex flex-col items-center justify-center gap-3 rounded-[12px] border border-border bg-card px-6 py-12 text-center"
		>
			<div className="flex flex-col gap-1">
				<h2 className="font-display text-xl font-medium text-foreground">
					Não foi possível carregar os feriados
				</h2>
				<p className="max-w-sm text-sm text-muted-foreground">
					{errorMessage ??
						"A BrasilAPI não respondeu agora. Tente novamente em instantes."}
				</p>
			</div>
			<Button type="button" variant="outline" onClick={onRetry}>
				<RefreshCcw aria-hidden="true" className="size-4" />
				Tentar novamente
			</Button>
		</div>
	)
}

function CalendarEmptyState() {
	return (
		<EmptyState
			title="Nenhum feriado encontrado"
			description="Tente consultar outro ano."
		/>
	)
}

function MonthCalendar({
	month,
	year,
}: {
	month: CalendarMonth
	year: number
}) {
	const firstWeekday = new Date(year, month.index, 1).getDay()

	return (
		<Card
			role="region"
			aria-labelledby={`calendar-month-${month.index}`}
			className="rounded-[22px] shadow-sm"
		>
			<CardHeader className="gap-1 pb-0">
				<CardTitle as="h2" id={`calendar-month-${month.index}`}>
					{month.name} {year}
				</CardTitle>
				<CardDescription>
					{month.days.filter((day) => day.holiday).length} feriado(s)
					nacional(is)
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
					{WEEKDAY_LABELS.map((weekday) => (
						<span key={weekday}>{weekday}</span>
					))}
				</div>
				<ul className="mt-2 grid grid-cols-7 gap-1">
					{Array.from({ length: firstWeekday }).map((_, index) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: empty calendar offsets never reorder
							key={`empty-${index}`}
							aria-hidden="true"
							className="min-h-10"
						/>
					))}
					{month.days.map((day) => (
						<CalendarDayCell key={day.date} day={day} />
					))}
				</ul>
			</CardContent>
		</Card>
	)
}

function CalendarDayCell({ day }: { day: CalendarDay }) {
	const holiday = day.holiday
	const holidayClassName = [
		"border-primary bg-primary text-primary-foreground shadow-sm",
		"font-semibold hover:bg-primary/90",
	].join(" ")

	return (
		<li
			aria-label={
				holiday ? formatHolidayAriaLabel(holiday) : `${day.day}, dia comum`
			}
			className={cn(
				"min-h-10 rounded-[12px] border border-border bg-muted p-2 text-sm",
				"transition-colors",
				holiday ? holidayClassName : "text-foreground",
			)}
		>
			<span className="block font-mono leading-none">{day.day}</span>
			{holiday ? (
				<span className="mt-1 line-clamp-2 block text-[11px] leading-tight">
					{holiday.name}
				</span>
			) : null}
		</li>
	)
}

function CalendarGrid({
	months,
	year,
}: {
	months: ReadonlyArray<CalendarMonth>
	year: number
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
			{months.map((month) => (
				<MonthCalendar key={month.name} month={month} year={year} />
			))}
		</div>
	)
}

function HolidaysPanel({
	holidays,
	year,
}: {
	holidays: ReadonlyArray<Feriado>
	year: number
}) {
	return (
		<aside
			className="flex flex-col gap-4"
			aria-labelledby="holidays-panel-title"
		>
			<Card className="rounded-[22px]">
				<CardHeader>
					<CardTitle as="h2" id="holidays-panel-title">
						Feriados de {year}
					</CardTitle>
					<CardDescription>Fonte: BrasilAPI</CardDescription>
				</CardHeader>
				<CardContent>
					{holidays.length > 0 ? (
						<ol className="flex flex-col gap-3">
							{holidays.map((holiday) => (
								<li
									key={`${holiday.date}-${holiday.name}`}
									className="rounded-[12px] border border-border bg-muted p-3"
								>
									<time
										dateTime={holiday.date}
										className="font-mono text-xs text-muted-foreground"
									>
										{formatReadableDate(holiday.date)}
									</time>
									<strong className="mt-1 block text-sm text-foreground">
										{holiday.name}
									</strong>
									<span className="text-xs text-muted-foreground">
										Feriado nacional
									</span>
								</li>
							))}
						</ol>
					) : (
						<p className="text-sm text-muted-foreground">
							Nenhum feriado nacional retornado para este ano.
						</p>
					)}
				</CardContent>
			</Card>
		</aside>
	)
}

export default function CalendarPage({ initialYear }: CalendarPageProps) {
	const [selectedYear, setSelectedYear] = useState(
		() => initialYear ?? new Date().getFullYear(),
	)
	const query = useFeriadosQuery(selectedYear)

	return (
		<PageContainer as="section" width="wide" className="gap-0">
			<PageHeader
				eyebrow="Feriados nacionais"
				title={`Calendário ${selectedYear}`}
				subtitle="Consulte feriados nacionais brasileiros por ano, direto da área logada."
				action={
					<YearNavigation
						selectedYear={selectedYear}
						onPreviousYear={() => setSelectedYear((year) => year - 1)}
						onNextYear={() => setSelectedYear((year) => year + 1)}
					/>
				}
			/>

			<CalendarQueryContent
				query={query}
				selectedYear={selectedYear}
				onRetry={() => {
					void query.refetch()
				}}
			/>
		</PageContainer>
	)
}

function CalendarQueryContent({
	query,
	selectedYear,
	onRetry,
}: {
	query: ReturnType<typeof useFeriadosQuery>
	selectedYear: number
	onRetry: () => void
}) {
	if (query.isPending) return <CalendarLoadingState />
	if (query.isError) {
		return (
			<CalendarErrorState
				errorMessage={query.error.userMessage}
				onRetry={onRetry}
			/>
		)
	}

	const holidays = query.data.toSorted(compareHolidayDate)

	if (holidays.length === 0) return <CalendarEmptyState />

	const months = buildCalendarMonths(selectedYear, holidays)

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
			<div className="min-w-0">
				<CalendarGrid months={months} year={selectedYear} />
			</div>
			<HolidaysPanel holidays={holidays} year={selectedYear} />
		</div>
	)
}
