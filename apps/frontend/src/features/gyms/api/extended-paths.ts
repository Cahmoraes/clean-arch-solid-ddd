import type { Client } from "openapi-fetch"
import { getApi } from "@/lib/api"

/**
 * Extended OpenAPI paths for endpoints not yet present in `@repo/api-types`.
 * The backend implements them; once the spec is regenerated, this can be
 * removed and the standard `api` client will be used directly.
 */
export interface GymSummary {
	id: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	cnpj?: string
	latitude: number
	longitude: number
}

export interface GymUpdateBody {
	cnpj: string
	title: string
	description?: string
	phone?: string
	latitude: number
	longitude: number
	address: string
}

export interface PaginatedGyms {
	items: GymSummary[]
	page: number
	total: number
}

export interface GymExtendedPaths {
	"/gyms": {
		get: {
			parameters: { query?: { page?: number } }
			responses: {
				200: { content: { "application/json": GymSummary[] } }
			}
		}
	}
	"/gyms/{id}": {
		get: {
			parameters: { path: { id: string } }
			responses: {
				200: { content: { "application/json": GymSummary } }
			}
		}
		put: {
			parameters: { path: { id: string } }
			requestBody: { content: { "application/json": GymUpdateBody } }
			responses: {
				200: {
					content: { "application/json": { message: string; id: string } }
				}
			}
		}
	}
}

/**
 * Returns the singleton API client typed with our local supplemental paths.
 * Auth middleware and error normalization apply uniformly to all paths.
 */
export function getGymsExtendedClient(): Client<GymExtendedPaths> {
	return getApi() as unknown as Client<GymExtendedPaths>
}
