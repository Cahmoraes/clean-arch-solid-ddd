import type { ResolutionContext } from "inversify"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { MongoPlanRepository } from "@/shared/infra/database/repository/mongo/mongo-plan-repository"
import { PrismaPlanRepository } from "@/shared/infra/database/repository/prisma/prisma-plan-repository"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"
import type { PlanRepository } from "@/subscription/application/repository/plan-repository"

export class PlanRepositoryProvider {
	public static provide(context: ResolutionContext): PlanRepository {
		if (isMongoEnabled()) {
			return context.get(MongoPlanRepository, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaPlanRepository, { autobind: true })
			: context.get(InMemoryPlanRepository, { autobind: true })
	}
}
