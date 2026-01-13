export interface HealthStatus {
	status: "healthy" | "unhealthy"
	timestamp: string
	version: string
	uptime: number
	services: {
		database: ServiceHealth
		cache: ServiceHealth
	}
}

export interface HealthProvider {
	readonly name: string
	check(): Promise<ServiceHealth>
}

export interface ServiceHealth {
	name: string
	status: "up" | "down"
	responseTime: number
	lastCheck: string
	error?: string
	metadata?: Record<string, any>
}
