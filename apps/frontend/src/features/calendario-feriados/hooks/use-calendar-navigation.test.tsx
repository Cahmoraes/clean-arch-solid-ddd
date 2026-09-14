import { act, renderHook } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { useCalendarNavigation } from "./use-calendar-navigation"

describe("useCalendarNavigation", () => {
	test("avança de dezembro para janeiro do próximo ano", () => {
		const { result } = renderHook(() => useCalendarNavigation(2026, 11))
		act(() => result.current.goNextMonth())
		expect(result.current.selectedYear).toBe(2027)
		expect(result.current.selectedMonth).toBe(0)
	})
	test("volta de janeiro para dezembro do ano anterior", () => {
		const { result } = renderHook(() => useCalendarNavigation(2026, 0))
		act(() => result.current.goPrevMonth())
		expect(result.current.selectedYear).toBe(2025)
		expect(result.current.selectedMonth).toBe(11)
	})
	test("goToToday restaura mês e ano atuais", () => {
		const { result } = renderHook(() => useCalendarNavigation(2020, 0))
		act(() => result.current.goToToday())
		const now = new Date()
		expect(result.current.selectedYear).toBe(now.getFullYear())
		expect(result.current.selectedMonth).toBe(now.getMonth())
	})
})
