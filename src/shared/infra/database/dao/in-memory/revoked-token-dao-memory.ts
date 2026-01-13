import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"

import type {
	RevokedTokenDAO,
	RevokedTokenData,
} from "@/session/application/dao/revoked-token-dao"

@injectable()
export class RevokedTokenDAOMemory implements RevokedTokenDAO {
	public revokedTokenData = new ExtendedSet<RevokedTokenData>()

	public async revoke(session: RevokedTokenData): Promise<void> {
		this.revokedTokenData.add(session)
	}

	public async revokedTokenById(id: string): Promise<RevokedTokenData | null> {
		return this.revokedTokenData.find((session) => id === session.jwi)
	}

	public async delete(session: RevokedTokenData): Promise<void> {
		this.revokedTokenData.delete(session)
	}
}
