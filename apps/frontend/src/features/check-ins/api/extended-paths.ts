import type { Client } from "openapi-fetch"
import { getApi } from "@/lib/api"

/**
 * Extended OpenAPI paths for `/check-ins` endpoints not yet present in
 * `@repo/api-types` (notably the GET list endpoint and the PATCH validate
 * verb adopted by the frontend contract). Once the spec is regenerated and
 * aligned, these can be removed and `api` can be used directly.
 */
export type SortOrder = "asc" | "desc"

export interface CheckIn {
	id: string
	gymId: string
	gymTitle?: string | null
	userId?: string
	validatedAt: string | null
	rejectedAt: string | null
	status: "pending" | "validated" | "rejected"
	createdAt: string
}

export interface PaginatedCheckIns {
	items: CheckIn[]
	page: number
	total: number
}

export interface CheckInsListQuery {
	page?: number
	status?: "pending" | "validated" | "rejected"
	gymName?: string
	sortOrder?: SortOrder
}

export interface CheckInStats {
	total: number
	validated: number
	pending: number
	rejected: number
}

export interface CheckInExtendedPaths {
	"/check-ins": {
		get: {
			parameters: { query?: CheckInsListQuery }
			responses: {
				200: { content: { "application/json": PaginatedCheckIns } }
			}
		}
	}
	"/check-ins/me": {
		get: {
			parameters: { query?: CheckInsListQuery }
			responses: {
				200: { content: { "application/json": PaginatedCheckIns } }
			}
		}
	}
	"/check-ins/stats": {
		get: {
			parameters: { query?: Record<string, never> }
			responses: {
				200: { content: { "application/json": CheckInStats } }
			}
		}
	}
	"/check-ins/me/stats": {
		get: {
			parameters: { query?: Record<string, never> }
			responses: {
				200: { content: { "application/json": CheckInStats } }
			}
		}
	}
	"/check-ins/validate": {
		patch: {
			requestBody: {
				content: { "application/json": { checkInId: string } }
			}
			responses: {
				200: {
					content: { "application/json": { checkInId: string } }
				}
			}
		}
	}
	"/check-ins/reject": {
		patch: {
			requestBody: {
				content: { "application/json": { checkInId: string } }
			}
			responses: {
				200: {
					content: { "application/json": { rejectedAt: string } }
				}
			}
		}
	}
}

export function getCheckInsExtendedClient(): Client<CheckInExtendedPaths> {
	return getApi() as unknown as Client<CheckInExtendedPaths>
}
