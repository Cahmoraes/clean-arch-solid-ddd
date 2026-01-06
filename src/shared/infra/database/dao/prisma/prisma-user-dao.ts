import type { PrismaClient } from "@prisma/client"
import { inject, injectable } from "inversify"

import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	FetchUsersInput,
	FetchUsersOutput,
	UserDAO,
} from "@/user/application/persistence/dao/user-dao"

@injectable()
export class PrismaUserDAO implements UserDAO {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient,
	) {}

	public async fetchAndCountUsers(
		input: FetchUsersInput,
	): Promise<FetchUsersOutput> {
		const usersData = await this.prisma.user.findMany({
			select: {
				email: true,
				id: true,
				name: true,
				role: true,
				created_at: true,
			},
			take: input.limit,
			skip: (input.page - 1) * input.limit,
		})
		return {
			total: await this.total(),
			usersData: usersData.map((userData) => ({
				id: userData.id,
				email: userData.email,
				name: userData.name,
				role: userData.role,
				createdAt: userData.created_at.toISOString(),
			})),
		}
	}

	private total(): Promise<number> {
		return this.prisma.user.count()
	}
}
