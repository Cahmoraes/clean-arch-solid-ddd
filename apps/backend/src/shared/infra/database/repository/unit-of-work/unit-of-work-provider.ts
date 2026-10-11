import type { ResolutionContext } from "inversify"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"
import { MongoUnitOfWork } from "./mongo-unit-of-work"
import { PrismaUnitOfWork } from "./prisma-unit-of-work"
import { TestingUnitOfWork } from "./testing-unit-of-work"
import type { UnitOfWork } from "./unit-of-work"

export class UnitOfWorkProvider {
	public static provide(context: ResolutionContext): UnitOfWork {
		if (isMongoEnabled()) {
			return context.get(MongoUnitOfWork, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaUnitOfWork, { autobind: true })
			: context.get(TestingUnitOfWork, { autobind: true })
	}
}
