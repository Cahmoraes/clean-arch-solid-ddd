import { QueryClient } from "@tanstack/react-query"

export const DEFAULT_STALE_TIME_MS = 30_000
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: DEFAULT_STALE_TIME_MS,
				retry: 1,
				refetchOnWindowFocus: false,
			},
			mutations: {
				retry: 0,
			},
		},
	})
}
