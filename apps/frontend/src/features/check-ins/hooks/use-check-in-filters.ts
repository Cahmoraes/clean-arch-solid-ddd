"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import type { SortOrder } from "../api/extended-paths"

export type CheckInFilterStatus =
	| "pending"
	| "validated"
	| "rejected"
	| undefined

export type { SortOrder }

const VALID_STATUSES = new Set<string>(["pending", "validated", "rejected"])
const VALID_SORT_ORDERS = new Set<string>(["asc", "desc"])

function parseStatus(value: string | null): CheckInFilterStatus {
	if (!value || !VALID_STATUSES.has(value)) return undefined
	return value as CheckInFilterStatus
}

function parsePage(value: string | null): number {
	const n = Number(value)
	return Number.isInteger(n) && n > 0 ? n : 1
}

function parseSortOrder(value: string | null): SortOrder {
	if (!value || !VALID_SORT_ORDERS.has(value)) return "desc"
	return value as SortOrder
}

export interface UseCheckInFiltersReturn {
	status: CheckInFilterStatus
	page: number
	gymName: string
	sortOrder: SortOrder
	setStatus: (status: CheckInFilterStatus) => void
	setPage: (page: number) => void
	setGymName: (name: string) => void
	setSortOrder: (order: SortOrder) => void
}

export function useCheckInFilters(): UseCheckInFiltersReturn {
	const searchParams = useSearchParams()
	const router = useRouter()

	const status = parseStatus(searchParams.get("status"))
	const page = parsePage(searchParams.get("page"))
	const gymName = searchParams.get("gymName") ?? ""
	const sortOrder = parseSortOrder(searchParams.get("sortOrder"))

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

	const setGymName = useCallback(
		(name: string) => {
			const params = new URLSearchParams(searchParams.toString())
			if (name) {
				params.set("gymName", name)
			} else {
				params.delete("gymName")
			}
			params.set("page", "1")
			router.replace(`?${params.toString()}`)
		},
		[searchParams, router],
	)

	const setSortOrder = useCallback(
		(order: SortOrder) => {
			const params = new URLSearchParams(searchParams.toString())
			params.set("sortOrder", order)
			params.set("page", "1")
			router.replace(`?${params.toString()}`)
		},
		[searchParams, router],
	)

	return {
		status,
		page,
		gymName,
		sortOrder,
		setStatus,
		setPage,
		setGymName,
		setSortOrder,
	}
}
