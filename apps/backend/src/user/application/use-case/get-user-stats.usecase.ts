import { inject, injectable } from "inversify"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { env } from "@/shared/infra/env"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import type { UserDAO, UserStatsOutput } from "../persistence/dao/user-dao"

export const USER_STATS_CACHE_KEY = "user-stats"

@injectable()
export class GetUserStatsUseCase {
	constructor(
		@inject(USER_TYPES.DAO.User)
		private readonly userDAO: UserDAO,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
	) {}

	public async execute(): Promise<UserStatsOutput> {
		const cached = await this.cacheDB.get<UserStatsOutput>(USER_STATS_CACHE_KEY)
		this.logger.info(this, { cached })
		if (cached) return cached
		const stats = await this.userDAO.countUserStats()
		void this.cacheDB
			.set(USER_STATS_CACHE_KEY, stats, env.TTL)
			.catch((error) =>
				this.logger.warn(this, `Falha ao salvar cache de stats: ${error}`),
			)
		return stats
	}
}
