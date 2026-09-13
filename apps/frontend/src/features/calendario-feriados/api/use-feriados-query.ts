"use client"

import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/errors"
import { DEFAULT_REQUEST_TIMEOUT_MS } from "@/lib/query-client"
import type { Feriado, FeriadoType } from "../model/feriado"

const BRASIL_API_FERIADOS_URL = "https://brasilapi.com.br/api/feriados/v1"
const FERIADOS_STALE_TIME_MS = 24 * 60 * 60 * 1000
const FERIADO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const FERIADO_TYPE: FeriadoType = "national"
const MIN_SUPPORTED_HOLIDAY_YEAR = 1900
const MAX_SUPPORTED_HOLIDAY_YEAR = 2199

interface BrasilApiHoliday {
	date: string
	name: string
	type: FeriadoType
}

interface RequestSignal {
	signal: AbortSignal
	abortReason: () => "timeout" | "cancelled" | null
	dispose: () => void
}

export const feriadosQueryKey = (year: number) => ["feriados", year] as const

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function isValidHolidayDate(date: string): boolean {
	if (!FERIADO_DATE_PATTERN.test(date)) return false
	const [year, month, day] = date.split("-").map(Number)
	if (
		year === undefined ||
		month === undefined ||
		day === undefined ||
		month < 1 ||
		month > 12 ||
		day < 1
	) {
		return false
	}
	const parsedDate = new Date(Date.UTC(year, month - 1, day))
	if (!Number.isFinite(parsedDate.getTime())) return false
	return (
		parsedDate.getUTCFullYear() === year &&
		parsedDate.getUTCMonth() === month - 1 &&
		parsedDate.getUTCDate() === day
	)
}

function isBrasilApiHoliday(value: unknown): value is BrasilApiHoliday {
	if (!isRecord(value)) return false
	return (
		typeof value.date === "string" &&
		isValidHolidayDate(value.date) &&
		typeof value.name === "string" &&
		value.name.trim().length > 0 &&
		value.type === FERIADO_TYPE
	)
}

function normalizeHoliday(holiday: BrasilApiHoliday): Feriado {
	return {
		date: holiday.date,
		name: holiday.name.trim(),
		type: holiday.type,
		isNational: holiday.type === FERIADO_TYPE,
	}
}

function parseHolidayPayload(payload: unknown): Feriado[] {
	if (!Array.isArray(payload) || !payload.every(isBrasilApiHoliday)) {
		throw ApiError.fromStatus(502, "holidays_invalid_response", payload)
	}
	return payload.map(normalizeHoliday)
}

function createRequestSignal(signal: AbortSignal): RequestSignal {
	const controller = new AbortController()
	let abortReason: "timeout" | "cancelled" | null = null

	const abortByParent = () => {
		if (controller.signal.aborted) return
		abortReason = "cancelled"
		controller.abort(signal.reason)
	}
	const timeoutId = globalThis.setTimeout(() => {
		if (controller.signal.aborted) return
		abortReason = "timeout"
		controller.abort(new DOMException("Request timed out", "TimeoutError"))
	}, DEFAULT_REQUEST_TIMEOUT_MS)

	if (signal.aborted) {
		abortByParent()
	} else {
		signal.addEventListener("abort", abortByParent, { once: true })
	}

	return {
		signal: controller.signal,
		abortReason: () => abortReason,
		dispose: () => {
			globalThis.clearTimeout(timeoutId)
			signal.removeEventListener("abort", abortByParent)
		},
	}
}

async function requestFeriados(
	year: number,
	requestSignal: RequestSignal,
): Promise<Response> {
	try {
		return await fetch(`${BRASIL_API_FERIADOS_URL}/${year}`, {
			signal: requestSignal.signal,
		})
	} catch (error) {
		if (requestSignal.abortReason() === "timeout") {
			throw ApiError.fromStatus(504, "holidays_timeout", error)
		}
		if (requestSignal.abortReason() === "cancelled") {
			throw error
		}
		throw ApiError.fromStatus(503, "holidays_unavailable", error)
	}
}

function ensureSuccessfulResponse(response: Response): void {
	if (!response.ok) {
		throw ApiError.fromStatus(response.status, "holidays_unavailable")
	}
}

async function readHolidayPayload(response: Response): Promise<unknown> {
	try {
		return await response.json()
	} catch (error) {
		throw ApiError.fromStatus(502, "holidays_invalid_response", error)
	}
}

async function fetchFeriados(
	year: number,
	signal: AbortSignal,
): Promise<Feriado[]> {
	const requestSignal = createRequestSignal(signal)
	try {
		const response = await requestFeriados(year, requestSignal)
		ensureSuccessfulResponse(response)
		return parseHolidayPayload(await readHolidayPayload(response))
	} finally {
		requestSignal.dispose()
	}
}

function shouldRetryFeriadosQuery(
	failureCount: number,
	error: ApiError,
): boolean {
	if (failureCount >= 1) return false
	if (error.status >= 400 && error.status < 500) return false
	if (error.code === "holidays_invalid_response") return false
	return true
}

function isSupportedHolidayYear(year: number | null): year is number {
	return (
		year !== null &&
		Number.isInteger(year) &&
		year >= MIN_SUPPORTED_HOLIDAY_YEAR &&
		year <= MAX_SUPPORTED_HOLIDAY_YEAR
	)
}

export function useFeriadosQuery(
	year: number | null,
): UseQueryResult<Feriado[], ApiError> {
	const queryKey = isSupportedHolidayYear(year)
		? feriadosQueryKey(year)
		: (["feriados", year === null ? "disabled" : "invalid"] as const)

	return useQuery<Feriado[], ApiError>({
		queryKey,
		queryFn: ({ signal }) => {
			if (!isSupportedHolidayYear(year)) {
				throw ApiError.fromStatus(400, "invalid_holiday_year")
			}
			return fetchFeriados(year, signal)
		},
		enabled: year !== null,
		retry: shouldRetryFeriadosQuery,
		staleTime: FERIADOS_STALE_TIME_MS,
		gcTime: FERIADOS_STALE_TIME_MS,
	})
}
