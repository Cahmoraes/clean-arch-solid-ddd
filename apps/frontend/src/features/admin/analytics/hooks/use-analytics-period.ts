"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

export type PeriodKey = "7d" | "30d" | "3m" | "12m"

const VALID_PERIODS: PeriodKey[] = ["7d", "30d", "3m", "12m"]
const DEFAULT_PERIOD: PeriodKey = "30d"

function isValidPeriod(value: string | null): value is PeriodKey {
	return VALID_PERIODS.includes(value as PeriodKey)
}

export interface UseAnalyticsPeriodReturn {
	period: PeriodKey
	setPeriod: (period: PeriodKey) => void
}

export function useAnalyticsPeriod(): UseAnalyticsPeriodReturn {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const rawPeriod = searchParams.get("period")
	const period: PeriodKey = isValidPeriod(rawPeriod)
		? rawPeriod
		: DEFAULT_PERIOD

	const setPeriod = useCallback(
		(newPeriod: PeriodKey) => {
			const params = new URLSearchParams(searchParams.toString())
			params.set("period", newPeriod)
			router.replace(`${pathname}?${params.toString()}`)
		},
		[router, pathname, searchParams],
	)

	return { period, setPeriod }
}
