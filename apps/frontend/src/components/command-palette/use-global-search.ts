import { useDebounce } from "@/hooks/use-debounce"

export interface GlobalSearchState {
	debouncedQuery: string
	isActive: boolean
}

export function useGlobalSearch(query: string): GlobalSearchState {
	const debouncedQuery = useDebounce(query, 300)
	const isActive = debouncedQuery.trim().length >= 2

	return {
		debouncedQuery: isActive ? debouncedQuery.trim() : "",
		isActive,
	}
}
