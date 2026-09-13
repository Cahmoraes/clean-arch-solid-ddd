"use client"

import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/errors"
import type { Feriado } from "../model/feriado"

const BRASIL_API_FERIADOS_URL = "https://brasilapi.com.br/api/feriados/v1"
const FERIADOS_STALE_TIME_MS = 24 * 60 * 60 * 1000

interface BrasilApiHoliday {
	date: string
	name: string
	type: string
}

export const feriadosQueryKey = (year: number) => ["feriados", year] as const

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function isBrasilApiHoliday(value: unknown): value is BrasilApiHoliday {
	if (!isRecord(value)) return false
	return (
		typeof value.date === "string" &&
		typeof value.name === "string" &&
		typeof value.type === "string"
	)
}

function normalizeHoliday(holiday: BrasilApiHoliday): Feriado {
	return {
		date: holiday.date,
		name: holiday.name.trim(),
		type: holiday.type,
		isNational:
			holiday.type === "national" || holiday.type === "Feriado Nacional",
	}
}

function parseHolidayPayload(payload: unknown): Feriado[] {
	if (!Array.isArray(payload) || !payload.every(isBrasilApiHoliday)) {
		throw ApiError.fromStatus(502, "holidays_invalid_response", payload)
	}
	return payload.map(normalizeHoliday)
}

async function fetchFeriados(
	year: number,
	signal: AbortSignal,
): Promise<Feriado[]> {
	let response: Response
	try {
		response = await fetch(`${BRASIL_API_FERIADOS_URL}/${year}`, { signal })
	} catch (error) {
		throw ApiError.fromStatus(503, "holidays_unavailable", error)
	}

	if (!response.ok) {
		throw ApiError.fromStatus(response.status, "holidays_unavailable")
	}

	let payload: unknown
	try {
		payload = await response.json()
	} catch (error) {
		throw ApiError.fromStatus(502, "holidays_invalid_response", error)
	}
	return parseHolidayPayload(payload)
}

export function useFeriadosQuery(
	year: number | null,
): UseQueryResult<Feriado[], ApiError> {
	return useQuery<Feriado[], ApiError>({
		queryKey: year === null ? ["feriados", "disabled"] : feriadosQueryKey(year),
		queryFn: ({ signal }) => {
			if (year === null) {
				throw ApiError.fromStatus(400, "invalid_holiday_year")
			}
			return fetchFeriados(year, signal)
		},
		enabled: year !== null,
		retry: 1,
		staleTime: FERIADOS_STALE_TIME_MS,
		gcTime: FERIADOS_STALE_TIME_MS,
	})
}
