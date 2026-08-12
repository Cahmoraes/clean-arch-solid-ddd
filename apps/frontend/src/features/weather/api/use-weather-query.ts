"use client"

import type { paths } from "@repo/api-types"
import type { UseQueryResult } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

type WeatherResponse =
	paths["/weather"]["get"]["responses"][200]["content"]["application/json"]

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export function useWeatherQuery(
	city: string | null,
): UseQueryResult<WeatherResponse, ApiError> {
	return useQuery<WeatherResponse, ApiError>({
		queryKey: ["weather", city],
		queryFn: async () => {
			const { data, error } = await api.GET("/weather", {
				params: { query: { city: city as string } },
			})
			if (error || !data) throw toApiError(error)
			return data
		},
		enabled: Boolean(city),
	})
}
