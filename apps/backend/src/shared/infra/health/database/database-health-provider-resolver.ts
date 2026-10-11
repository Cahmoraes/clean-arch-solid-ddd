import type { ResolutionContext } from "inversify"
import { isMongoEnabled } from "@/shared/infra/env"
import type { HealthProvider } from "@/shared/infra/health/health-check"
import { DatabaseHealthProvider } from "./database-health-provider"
import { MongoDatabaseHealthProvider } from "./mongo-database-health-provider"

export class DatabaseHealthProviderResolver {
	public static provide(context: ResolutionContext): HealthProvider {
		return isMongoEnabled()
			? context.get(MongoDatabaseHealthProvider, { autobind: true })
			: context.get(DatabaseHealthProvider, { autobind: true })
	}
}
