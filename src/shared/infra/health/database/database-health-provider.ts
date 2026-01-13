import { inject, injectable } from "inversify"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"

import { SHARED_TYPES } from "../../ioc/types"
import type { HealthProvider, ServiceHealth } from "../health-check"

@injectable()
export class DatabaseHealthProvider implements HealthProvider {
	public readonly name = "database"

	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly connection: PrismaClient,
	) {}

	public async check(): Promise<ServiceHealth> {
		const startTime = Date.now()
		try {
			await this.connection.$queryRaw`SELECT 1`
			return this.createServiceHealthResponse("up", startTime)
		} catch (error) {
			return this.createServiceHealthResponse("down", startTime, error)
		}
	}

	private createServiceHealthResponse(
		status: ServiceHealth["status"],
		startTime: number,
		error?: unknown,
	): ServiceHealth {
		const response: ServiceHealth = {
			name: this.name,
			status,
			responseTime: Date.now() - startTime,
			lastCheck: new Date().toISOString(),
			metadata: {
				provider: "prisma",
				database: "postgresql",
			},
		}
		if (error && status === "down") {
			response.error =
				error instanceof Error ? error.message : "Unknown database error"
		}
		return response
	}
}
