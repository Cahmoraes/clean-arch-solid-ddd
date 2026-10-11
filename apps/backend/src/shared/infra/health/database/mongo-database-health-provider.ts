import { inject, injectable } from "inversify"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { SHARED_TYPES } from "../../ioc/types"
import type { HealthProvider, ServiceHealth } from "../health-check"

@injectable()
export class MongoDatabaseHealthProvider implements HealthProvider {
	public readonly name = "database"

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async check(): Promise<ServiceHealth> {
		const startTime = Date.now()
		try {
			await this.connection.ping()
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
				provider: "mongo",
				database: "mongodb",
			},
		}
		if (error && status === "down") {
			response.error =
				error instanceof Error ? error.message : "Unknown database error"
		}
		return response
	}
}
