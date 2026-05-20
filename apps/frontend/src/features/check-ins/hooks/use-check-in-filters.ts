"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

export type CheckInFilterStatus =
	| "pending"
	| "validated"
	| "rejected"
	| undefined

const VALID_STATUSES = new Set<string>(["pending", "validated", "rejected"])

function parseStatus(value: string | null): CheckInFilterStatus {
	if (!value || !VALID_STATUSES.has(value)) return undefined
	return value as CheckInFilterStatus
}

function parsePage(value: string | null): number {
	const n = Number(value)
	return Number.isInteger(n) && n > 0 ? n : 1
}

export interface UseCheckInFiltersReturn {
	status: CheckInFilterStatus
	page: number
	setStatus: (status: CheckInFilterStatus) => void
	setPage: (page: number) => void
}

export function useCheckInFilters(): UseCheckInFiltersReturn {
	const searchParams = useSearchParams()
	const router = useRouter()

	const status = parseStatus(searchParams.get("status"))
	const page = parsePage(searchParams.get("page"))

	const setStatus = useCallback(
		(newStatus: CheckInFilterStatus) => {
			const params = new URLSearchParams(searchParams.toString())
			if (newStatus) {
				params.set("status", newStatus)
			} else {
				params.delete("status")
			}
			params.set("page", "1")
			router.replace(`?${params.toString()}`)
		},
		[searchParams, router],
	)

	const setPage = useCallback(
		(newPage: number) => {
			const params = new URLSearchParams(searchParams.toString())
			params.set("page", String(newPage))
			router.replace(`?${params.toString()}`)
		},
		[searchParams, router],
	)

	return { status, page, setStatus, setPage }
}
