"use client"
import { useCallback, useState } from "react"

export interface UseCalendarNavigationReturn {
	selectedYear: number
	selectedMonth: number
	goPrevMonth: () => void
	goNextMonth: () => void
	goPrevYear: () => void
	goNextYear: () => void
	goToToday: () => void
}

const clampYear = (y: number) => Math.min(2199, Math.max(1900, y))

export function useCalendarNavigation(
	initialYear?: number,
	initialMonth?: number,
): UseCalendarNavigationReturn {
	const getInitial = () => {
		const d = new Date()
		return {
			year: initialYear ?? d.getFullYear(),
			month: initialMonth ?? d.getMonth(),
		}
	}
	const [state, setState] = useState<State>(getInitial)

	const goPrevMonth = useCallback(() => {
		setState((prev) => {
			if (prev.month === 0) return { year: clampYear(prev.year - 1), month: 11 }
			return { year: prev.year, month: prev.month - 1 }
		})
	}, [])
	const goNextMonth = useCallback(() => {
		setState((prev) => {
			if (prev.month === 11) return { year: clampYear(prev.year + 1), month: 0 }
			return { year: prev.year, month: prev.month + 1 }
		})
	}, [])
	const goPrevYear = useCallback(
		() => setState((prev) => ({ ...prev, year: clampYear(prev.year - 1) })),
		[],
	)
	const goNextYear = useCallback(
		() => setState((prev) => ({ ...prev, year: clampYear(prev.year + 1) })),
		[],
	)
	const goToToday = useCallback(() => {
		const d = new Date()
		setState({ year: clampYear(d.getFullYear()), month: d.getMonth() })
	}, [])

	return {
		selectedYear: state.year,
		selectedMonth: state.month,
		goPrevMonth,
		goNextMonth,
		goPrevYear,
		goNextYear,
		goToToday,
	}
}
type State = { year: number; month: number }

export function getMonthLabel(monthIndex: number, year: number): string {
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
	]
	return `${MONTH_NAMES[monthIndex]} ${year}`
}
