import { inject, injectable } from "inversify"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
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
		const where = input.query
			? {
					OR: [
						{
							name: {
								contains: input.query,
								mode: "insensitive" as const,
							},
						},
						{
							email: {
								contains: input.query,
								mode: "insensitive" as const,
							},
						},
					],
				}
			: undefined
		const usersData = await this.prisma.user.findMany({
			select: {
				email: true,
				id: true,
				name: true,
				role: true,
				status: true,
				created_at: true,
			},
			where,
			take: input.limit,
			skip: (input.page - 1) * input.limit,
		})
		return {
			total: await this.total(input.query),
			usersData: usersData.map((userData) => ({
				id: userData.id,
				email: userData.email,
				name: userData.name,
				role: userData.role,
				status: userData.status,
				createdAt: userData.created_at.toISOString(),
			})),
		}
	}

	private total(query?: string): Promise<number> {
		if (!query) return this.prisma.user.count()
		return this.prisma.user.count({
			where: {
				OR: [
					{ name: { contains: query, mode: "insensitive" as const } },
					{ email: { contains: query, mode: "insensitive" as const } },
				],
			},
		})
	}
}
