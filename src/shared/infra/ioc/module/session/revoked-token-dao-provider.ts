import { type ResolutionContext } from "inversify"

import { RevokedTokenDAOMemory } from "@/shared/infra/database/dao/in-memory/revoked-token-dao-memory"
import { RedisRevokedTokenDAO } from "@/shared/infra/database/dao/redis/redis-revoked-token-dao"
import { isProduction } from "@/shared/infra/env"

export class RevokedTokenDAOProvider {
	public static provide(context: ResolutionContext) {
		return isProduction()
			? context.get(RedisRevokedTokenDAO, { autobind: true })
			: context.get(RevokedTokenDAOMemory, { autobind: true })
	}
}
