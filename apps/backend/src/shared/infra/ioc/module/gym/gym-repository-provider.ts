import type { ResolutionContext } from "inversify"
import type { GymRepository } from "@/gym/application/repository/gym-repository"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { MongoGymRepository } from "@/shared/infra/database/repository/mongo/mongo-gym-repository"
import { PrismaGymRepository } from "@/shared/infra/database/repository/prisma/prisma-gym-repository"
import { isMongoEnabled, isProduction } from "@/shared/infra/env"

export class GymRepositoryProvider {
	public static provide(context: ResolutionContext): GymRepository {
		if (isMongoEnabled()) {
			return context.get(MongoGymRepository, { autobind: true })
		}
		return isProduction()
			? context.get(PrismaGymRepository, { autobind: true })
			: context.get(InMemoryGymRepository, { autobind: true })
	}
}
