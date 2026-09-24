"use client"

import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	RefreshCcw,
} from "@/components/ui/pixel-icons"
import { useCallback, useEffect, useRef } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useFeriadosQuery } from "@/features/calendario-feriados/api/use-feriados-query"
import { useCalendarNavigation } from "@/features/calendario-feriados/hooks/use-calendar-navigation"
import { getFeriadosDoMes } from "@/features/calendario-feriados/lib/get-feriados-do-mes"
import { HolidayList } from "@/features/calendario-feriados/ui/holiday-list"
import { MonthlyCalendar } from "@/features/calendario-feriados/ui/monthly-calendar"

type CalendarPageProps = {
	initialYear?: number
	initialMonth?: number
}

function YearNavigation({
	selectedYear,
	onPreviousYear,
	onNextYear,
	onToday,
	isToday,
	prevYearBtnRef,
}: {
	selectedYear: number
	onPreviousYear: () => void
	onNextYear: () => void
	onToday: () => void
	isToday: boolean
	prevYearBtnRef?: React.RefObject<HTMLButtonElement | null>
}) {
	return (
		<nav
			aria-label="Navegação de anos"
			className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
		>
			<Button
				ref={prevYearBtnRef}
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
			<span className="rounded-sm border border-border bg-card px-4 py-2 text-center font-display text-lg text-foreground">
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
			<Button
				type="button"
				variant="secondary"
				size="sm"
				aria-label="Ir para hoje"
				onClick={onToday}
				disabled={isToday}
				className="w-full sm:w-auto"
			>
				<CalendarDays aria-hidden="true" className="size-4" />
				Hoje
			</Button>
		</nav>
	)
}

function CalendarLoadingState() {
	return (
		<div role="status" aria-live="polite" className="flex flex-col gap-4">
			<span className="sr-only">Carregando feriados</span>
			<Skeleton className="h-56 w-full rounded-xl" />
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
			className="flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-card px-6 py-12 text-center"
		>
			<div className="flex flex-col gap-1">
				<h2 className="font-display text-xl text-foreground">
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

function getSwipeDirection(dx: number, dy: number): "prev" | "next" | null {
	if (dy > 30) return null
	if (Math.abs(dx) <= 40) return null
	return dx > 0 ? "prev" : "next"
}

function isMobileViewport(): boolean {
	if (typeof window === "undefined") return true
	if (!window.matchMedia) return true
	return window.matchMedia("(max-width: 767px)").matches
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: view branches for loading/error/empty/content
function CalendarContent({
	query,
	selectedYear,
	selectedMonth,
	feriadosDoMes,
	handlePrevMonth,
	handleNextMonth,
	prevBtnRef,
	nextBtnRef,
	onTouchStart,
	onTouchEnd,
}: {
	query: ReturnType<typeof useFeriadosQuery>
	selectedYear: number
	selectedMonth: number
	feriadosDoMes: ReturnType<typeof getFeriadosDoMes>
	handlePrevMonth: () => void
	handleNextMonth: () => void
	prevBtnRef: React.RefObject<HTMLButtonElement | null>
	nextBtnRef: React.RefObject<HTMLButtonElement | null>
	onTouchStart: (e: React.TouchEvent) => void
	onTouchEnd: (e: React.TouchEvent) => void
}) {
	if (query.isPending && !query.data) return <CalendarLoadingState />
	if (query.isError)
		return (
			<CalendarErrorState
				errorMessage={query.error.userMessage}
				onRetry={() => {
					void query.refetch()
				}}
			/>
		)
	if (query.data && query.data.length === 0) return <CalendarEmptyState />
	return (
		<div
			className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
			onTouchStart={onTouchStart}
			onTouchEnd={onTouchEnd}
		>
			<MonthlyCalendar
				monthIndex={selectedMonth}
				year={selectedYear}
				feriados={feriadosDoMes}
				onPrevMonth={handlePrevMonth}
				onNextMonth={handleNextMonth}
				prevBtnRef={prevBtnRef}
				nextBtnRef={nextBtnRef}
			/>
			{/* biome-ignore lint/a11y/noRedundantRoles: spec exige role="complementary" explícito em aside */}
			<aside role="complementary" aria-label="Feriados do mês">
				<HolidayList
					feriados={feriadosDoMes}
					monthIndex={selectedMonth}
					year={selectedYear}
					total={query.data?.length ?? 0}
				/>
			</aside>
			{query.isFetching ? (
				<span role="status" className="sr-only">
					Carregando feriados de {selectedYear}
				</span>
			) : null}
		</div>
	)
}

export default function CalendarPage({
	initialYear,
	initialMonth,
}: CalendarPageProps) {
	const {
		selectedYear,
		selectedMonth,
		goPrevMonth,
		goNextMonth,
		goPrevYear,
		goNextYear,
		goToToday,
	} = useCalendarNavigation(initialYear, initialMonth)
	const query = useFeriadosQuery(selectedYear)
	const feriadosDoMes = query.data
		? getFeriadosDoMes(query.data, selectedMonth)
		: []
	const now = new Date()
	const isToday =
		selectedYear === now.getFullYear() && selectedMonth === now.getMonth()

	const prevBtnRef = useRef<HTMLButtonElement>(null)
	const nextBtnRef = useRef<HTMLButtonElement>(null)
	const prevYearBtnRef = useRef<HTMLButtonElement>(null)
	const touchRef = useRef<{ x: number; y: number } | null>(null)

	const handlePrevMonth = useCallback(() => {
		goPrevMonth()
		queueMicrotask(() => prevBtnRef.current?.focus())
	}, [goPrevMonth])

	const handleNextMonth = useCallback(() => {
		goNextMonth()
		queueMicrotask(() => nextBtnRef.current?.focus())
	}, [goNextMonth])

	const handleToday = useCallback(() => {
		goToToday()
		// o próprio botão "Hoje" fica disabled após a ação; move o foco para
		// o botão de ano anterior (sempre habilitado) em vez de perdê-lo
		queueMicrotask(() => prevYearBtnRef.current?.focus())
	}, [goToToday])

	const onTouchStart = useCallback((e: React.TouchEvent) => {
		touchRef.current = {
			x: e.touches[0]?.clientX ?? 0,
			y: e.touches[0]?.clientY ?? 0,
		}
	}, [])

	const onTouchEnd = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: swipe threshold
		(e: React.TouchEvent) => {
			if (!touchRef.current) return
			if (!isMobileViewport()) return
			const touch = e.changedTouches[0]
			if (!touch) return
			const dx = touch.clientX - touchRef.current.x
			const dy = Math.abs(touch.clientY - touchRef.current.y)
			const dir = getSwipeDirection(dx, dy)
			if (dir === "prev") handlePrevMonth()
			if (dir === "next") handleNextMonth()
		},
		[handleNextMonth, handlePrevMonth],
	)

	useEffect(() => {
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: keyboard handler
		const handler = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") handlePrevMonth()
			if (e.key === "ArrowRight") handleNextMonth()
		}
		window.addEventListener("keydown", handler)
		return () => window.removeEventListener("keydown", handler)
	}, [handleNextMonth, handlePrevMonth])

	return (
		<PageContainer as="section" width="wide" className="gap-0">
			<PageHeader
				eyebrow="Feriados nacionais"
				title={`Calendário ${selectedYear}`}
				subtitle="Consulte feriados nacionais brasileiros por ano, direto da área logada."
				action={
					<YearNavigation
						selectedYear={selectedYear}
						onPreviousYear={goPrevYear}
						onNextYear={goNextYear}
						onToday={handleToday}
						isToday={isToday}
						prevYearBtnRef={prevYearBtnRef}
					/>
				}
			/>
			<CalendarContent
				query={query}
				selectedYear={selectedYear}
				selectedMonth={selectedMonth}
				feriadosDoMes={feriadosDoMes}
				handlePrevMonth={handlePrevMonth}
				handleNextMonth={handleNextMonth}
				prevBtnRef={prevBtnRef}
				nextBtnRef={nextBtnRef}
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
			/>
		</PageContainer>
	)
}
