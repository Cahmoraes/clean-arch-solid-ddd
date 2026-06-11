import { inject, injectable } from "inversify"

import { version } from "../../../../package.json"
import { HEALTH_CHECK_TYPES } from "../ioc/types"
import type { CacheHealthProvider } from "./cache/cache-health-provider"
import type { DatabaseHealthProvider } from "./database/database-health-provider"
import type { HealthStatus, ServiceHealth } from "./health-check"

export type HealthCheckStatusType = "healthy" | "unhealthy"

@injectable()
export class HealthCheckImpl {
	constructor(
		@inject(HEALTH_CHECK_TYPES.Providers.Database)
		private readonly databaseProvider: DatabaseHealthProvider,
		@inject(HEALTH_CHECK_TYPES.Providers.Cache)
		private readonly cacheProvider: CacheHealthProvider,
	) {}

	public async check(): Promise<HealthStatus> {
		const services = await Promise.all([
			this.databaseProvider.check(),
			this.cacheProvider.check(),
		])
		return {
			status: this.determineOverallStatus(services),
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			version,
			services: {
				database: services[0],
				cache: services[1],
			},
		}
	}

	private determineOverallStatus(
		services: ServiceHealth[],
	): HealthCheckStatusType {
		return services.some((service): boolean => service.status === "down")
			? "unhealthy"
			: "healthy"
	}
}
