"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
} from "@/components/ui/pixel-icons"
import { useFeriadosQuery } from "@/features/calendario-feriados/api/use-feriados-query"
import { useCalendarNavigation } from "@/features/calendario-feriados/hooks/use-calendar-navigation"
import { getFeriadosDoMes } from "@/features/calendario-feriados/lib/get-feriados-do-mes"
import { isMonthShortcutBlocked } from "@/features/calendario-feriados/lib/month-shortcut"
import { resolveSelectedDay } from "@/features/calendario-feriados/lib/resolve-selected-day"
import type { Feriado } from "@/features/calendario-feriados/model/feriado"
import {
	type FonteStatus,
	statusDaFonte,
} from "@/features/calendario-feriados/model/fonte-status"
import { DayDetailPanel } from "@/features/calendario-feriados/ui/day-detail-panel"
import { MonthAgenda } from "@/features/calendario-feriados/ui/month-agenda"
import { MonthlyCalendar } from "@/features/calendario-feriados/ui/monthly-calendar"
import {
	type TrainingNoteDTO,
	useTrainingNotesQuery,
} from "@/features/training-notes/api/use-training-notes"
import { DeleteNoteDialog } from "@/features/training-notes/ui/delete-note-dialog"
import { NoteModal } from "@/features/training-notes/ui/training-note-modal"

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

interface CalendarSources {
	feriadosDoMes: Feriado[]
	notasDoMes: TrainingNoteDTO[]
	notasPorData: Readonly<Record<string, string>>
	feriadosStatus: FonteStatus
	notasStatus: FonteStatus
	feriadosFetching: boolean
	refetchFeriados: () => void
	refetchNotas: () => void
}

function statusDaQuery(query: {
	isPending: boolean
	isError: boolean
	data: unknown
}): FonteStatus {
	return statusDaFonte({
		isPending: query.isPending,
		isError: query.isError,
		hasData: query.data !== undefined,
	})
}

/** Feriados (ano) e notas (mês) carregam e falham de forma independente. */
function useCalendarSources(year: number, monthIndex: number): CalendarSources {
	const feriadosQuery = useFeriadosQuery(year)
	const notasQuery = useTrainingNotesQuery(year, monthIndex + 1)
	const notasDoMes = notasQuery.data ?? []
	const notasPorData = useMemo(() => {
		const mapa: Record<string, string> = {}
		for (const nota of notasQuery.data ?? []) {
			mapa[nota.data] = nota.texto
		}
		return mapa
	}, [notasQuery.data])
	return {
		feriadosDoMes: getFeriadosDoMes(feriadosQuery.data ?? [], monthIndex),
		notasDoMes,
		notasPorData,
		feriadosStatus: statusDaQuery(feriadosQuery),
		notasStatus: statusDaQuery(notasQuery),
		feriadosFetching: feriadosQuery.isFetching,
		refetchFeriados: () => {
			void feriadosQuery.refetch()
		},
		refetchNotas: () => {
			void notasQuery.refetch()
		},
	}
}

interface CalendarContentProps {
	year: number
	monthIndex: number
	selectedDate: string
	sources: CalendarSources
	handlePrevMonth: () => void
	handleNextMonth: () => void
	prevBtnRef: React.RefObject<HTMLButtonElement | null>
	nextBtnRef: React.RefObject<HTMLButtonElement | null>
	onTouchStart: (e: React.TouchEvent) => void
	onTouchEnd: (e: React.TouchEvent) => void
	onSelectDay: (date: string) => void
	onEdit: () => void
	onDelete: () => void
}

// A partir de 1280px o painel não contribui com altura própria (h-0) e
// estica até a altura da grade (min-h-full); a lista rola por dentro.
const PAINEL_NA_ALTURA_DA_GRADE = "xl:h-0 xl:min-h-full"

function CalendarContent(props: CalendarContentProps) {
	const { sources, selectedDate } = props
	return (
		<div
			className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
			onTouchStart={props.onTouchStart}
			onTouchEnd={props.onTouchEnd}
		>
			<MonthlyCalendar
				monthIndex={props.monthIndex}
				year={props.year}
				feriados={sources.feriadosDoMes}
				notas={sources.notasPorData}
				selectedDate={selectedDate}
				onSelectDay={props.onSelectDay}
				onPrevMonth={props.handlePrevMonth}
				onNextMonth={props.handleNextMonth}
				prevBtnRef={props.prevBtnRef}
				nextBtnRef={props.nextBtnRef}
			/>
			<DayDetailPanel
				className={PAINEL_NA_ALTURA_DA_GRADE}
				date={selectedDate}
				feriado={sources.feriadosDoMes.find((f) => f.date === selectedDate)}
				nota={sources.notasDoMes.find((n) => n.data === selectedDate)}
				notasStatus={sources.notasStatus}
				feriadosStatus={sources.feriadosStatus}
				onEdit={props.onEdit}
				onDelete={props.onDelete}
				onRetryNotas={sources.refetchNotas}
				onRetryFeriados={sources.refetchFeriados}
			>
				<MonthAgenda
					feriados={sources.feriadosDoMes}
					notas={sources.notasDoMes}
					selectedDate={selectedDate}
					onSelectDay={props.onSelectDay}
					notasStatus={sources.notasStatus}
					feriadosStatus={sources.feriadosStatus}
					onRetryNotas={sources.refetchNotas}
					onRetryFeriados={sources.refetchFeriados}
				/>
			</DayDetailPanel>
			{sources.feriadosFetching && sources.feriadosStatus === "ok" ? (
				<span role="status" className="sr-only">
					Carregando feriados de {props.year}
				</span>
			) : null}
		</div>
	)
}

function focusDay(date: string): void {
	queueMicrotask(() => {
		document
			.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)
			?.focus()
	})
}

/** Dia (botão da grade) ou elemento exato que deve receber o foco. */
type FocusTarget = string | HTMLElement

function applyFocus(target: FocusTarget): void {
	if (typeof target === "string") focusDay(target)
	else target.focus()
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
	const sources = useCalendarSources(selectedYear, selectedMonth)
	const [clickedDate, setClickedDate] = useState<string | null>(null)
	const [modalOpen, setModalOpen] = useState(false)
	const [deleteDate, setDeleteDate] = useState<string | null>(null)
	// Quem abriu o diálogo de exclusão (botão Excluir do painel ou do modal).
	const deleteOpenerRef = useRef<HTMLElement | null>(null)
	// Alvo do foco depois que o diálogo fecha: o diálogo ainda prende o foco
	// enquanto montado, então o foco só vai depois do commit que o desmonta.
	// Cancelar e Esc voltam a quem abriu; excluir leva ao botão do dia.
	const [focusAfterDialog, setFocusAfterDialog] = useState<FocusTarget | null>(
		null,
	)
	const selectedDate = resolveSelectedDay({
		clicked: clickedDate,
		year: selectedYear,
		monthIndex: selectedMonth,
		today: new Date(),
	})
	useEffect(() => {
		if (focusAfterDialog === null) return
		applyFocus(focusAfterDialog)
		setFocusAfterDialog(null)
	}, [focusAfterDialog])
	const feriadoDoDia = sources.feriadosDoMes.find(
		(feriado) => feriado.date === selectedDate,
	)
	const notaDoDia = sources.notasDoMes.find(
		(nota) => nota.data === selectedDate,
	)

	const now = new Date()
	const isToday =
		selectedYear === now.getFullYear() && selectedMonth === now.getMonth()

	const prevBtnRef = useRef<HTMLButtonElement>(null)
	const nextBtnRef = useRef<HTMLButtonElement>(null)
	const prevYearBtnRef = useRef<HTMLButtonElement>(null)
	const touchRef = useRef<{ x: number; y: number } | null>(null)

	const requestDelete = useCallback((date: string) => {
		const ativo = document.activeElement
		deleteOpenerRef.current = ativo instanceof HTMLElement ? ativo : null
		setDeleteDate(date)
	}, [])

	const handlePrevMonth = useCallback(() => {
		goPrevMonth()
		setClickedDate(null)
		queueMicrotask(() => prevBtnRef.current?.focus())
	}, [goPrevMonth])

	const handleNextMonth = useCallback(() => {
		goNextMonth()
		setClickedDate(null)
		queueMicrotask(() => nextBtnRef.current?.focus())
	}, [goNextMonth])

	const handlePrevYear = useCallback(() => {
		goPrevYear()
		setClickedDate(null)
	}, [goPrevYear])

	const handleNextYear = useCallback(() => {
		goNextYear()
		setClickedDate(null)
	}, [goNextYear])

	const handleToday = useCallback(() => {
		goToToday()
		setClickedDate(null)
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

	const overlayOpen = modalOpen || deleteDate !== null
	useEffect(() => {
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: keyboard handler
		const handler = (e: KeyboardEvent) => {
			if (isMonthShortcutBlocked(e, overlayOpen)) return
			if (e.key === "ArrowLeft") handlePrevMonth()
			if (e.key === "ArrowRight") handleNextMonth()
		}
		window.addEventListener("keydown", handler)
		return () => window.removeEventListener("keydown", handler)
	}, [handleNextMonth, handlePrevMonth, overlayOpen])

	return (
		<PageContainer as="section" width="wide" className="gap-0">
			<PageHeader
				eyebrow="Feriados nacionais"
				title={`Calendário ${selectedYear}`}
				subtitle="Consulte feriados nacionais brasileiros por ano, direto da área logada."
				action={
					<YearNavigation
						selectedYear={selectedYear}
						onPreviousYear={handlePrevYear}
						onNextYear={handleNextYear}
						onToday={handleToday}
						isToday={isToday}
						prevYearBtnRef={prevYearBtnRef}
					/>
				}
			/>
			<CalendarContent
				year={selectedYear}
				monthIndex={selectedMonth}
				selectedDate={selectedDate}
				sources={sources}
				handlePrevMonth={handlePrevMonth}
				handleNextMonth={handleNextMonth}
				prevBtnRef={prevBtnRef}
				nextBtnRef={nextBtnRef}
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
				onSelectDay={setClickedDate}
				onEdit={() => setModalOpen(true)}
				onDelete={() => requestDelete(selectedDate)}
			/>
			<NoteModal
				open={modalOpen}
				date={selectedDate}
				feriadoNome={feriadoDoDia?.name}
				initialTexto={notaDoDia?.texto}
				onOpenChange={setModalOpen}
				onRequestDelete={requestDelete}
				onCloseAutoFocus={(event) => {
					event.preventDefault()
					focusDay(selectedDate)
				}}
			/>
			<DeleteNoteDialog
				open={deleteDate !== null}
				date={deleteDate}
				onOpenChange={(aberto) => {
					if (aberto) return
					setDeleteDate(null)
					// Exclusão confirmada sobrescreve este alvo em onDeleted.
					setFocusAfterDialog(deleteOpenerRef.current)
				}}
				onDeleted={() => {
					setModalOpen(false)
					setFocusAfterDialog(selectedDate)
				}}
			/>
		</PageContainer>
	)
}
