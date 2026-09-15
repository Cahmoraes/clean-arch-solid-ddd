import type { Client } from "openapi-fetch"
import type { DayScheduleDTO } from "@/features/gyms/schemas/operating-hours-schema"
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
	status: "activated" | "deactivated"
	operatingHours?: DayScheduleDTO[] | null
}

interface GymBodyBase {
	cnpj: string
	title: string
	description?: string
	phone?: string
	latitude: number
	longitude: number
	address: string
}

export interface GymCreateBody extends GymBodyBase {
	operatingHours?: DayScheduleDTO[]
}

export interface GymUpdateBody extends GymBodyBase {
	operatingHours?: DayScheduleDTO[] | null
}

export interface PaginatedGyms {
	items: GymSummary[]
	page: number
	total: number
}

export interface GymStatusChangeResult {
	message: string
}

export interface GymExtendedPaths {
	"/gyms": {
		get: {
			parameters: { query?: { page?: number } }
			responses: {
				200: {
					content: {
						"application/json": {
							gyms: GymSummary[]
							pagination: {
								total: number
								page: number
								limit: number
							}
						}
					}
				}
			}
		}
	}
	"/gyms/{gymId}": {
		get: {
			parameters: { path: { gymId: string } }
			responses: {
				200: { content: { "application/json": GymSummary } }
			}
		}
		put: {
			parameters: { path: { gymId: string } }
			requestBody: { content: { "application/json": GymUpdateBody } }
			responses: {
				200: {
					content: { "application/json": { message: string; id: string } }
				}
			}
		}
	}
	"/gyms/{gymId}/deactivate": {
		patch: {
			parameters: { path: { gymId: string } }
			responses: {
				200: {
					content: { "application/json": GymStatusChangeResult }
				}
			}
		}
	}
	"/gyms/{gymId}/activate": {
		patch: {
			parameters: { path: { gymId: string } }
			responses: {
				200: {
					content: { "application/json": GymStatusChangeResult }
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
