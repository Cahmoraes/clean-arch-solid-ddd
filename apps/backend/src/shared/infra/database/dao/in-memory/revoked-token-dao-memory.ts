import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
	RevokedTokenDAO,
	RevokedTokenData,
} from "@/session/application/dao/revoked-token-dao"

@injectable()
export class RevokedTokenDAOMemory implements RevokedTokenDAO {
	public revokedTokenData = new ExtendedSet<RevokedTokenData>()
	private revokedUsersAt = new Map<string, number>()

	public async revoke(session: RevokedTokenData): Promise<void> {
		this.revokedTokenData.add(session)
	}

	public async revokedTokenById(id: string): Promise<RevokedTokenData | null> {
		return this.revokedTokenData.find((session) => id === session.jwi)
	}

	public async delete(session: RevokedTokenData): Promise<void> {
		this.revokedTokenData.delete(session)
	}

	public async revokeAllForUser(userId: string, _ttl: number): Promise<void> {
		this.revokedUsersAt.set(userId, Math.floor(Date.now() / 1000))
	}

	public async revokedAfterForUser(userId: string): Promise<number | null> {
		return this.revokedUsersAt.get(userId) ?? null
	}
}
