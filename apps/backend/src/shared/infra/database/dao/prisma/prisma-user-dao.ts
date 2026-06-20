import { inject, injectable } from "inversify"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { $Enums } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	FetchUsersInput,
	FetchUsersOutput,
	UserDAO,
	UserStatsOutput,
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
		const where = this.buildWhereClause(input)
		const [usersData, total] = await Promise.all([
			this.prisma.user.findMany({
				select: {
					email: true,
					id: true,
					name: true,
					role: true,
					status: true,
					created_at: true,
					is_super_admin: true,
				},
				where,
				take: input.limit,
				skip: (input.page - 1) * input.limit,
			}),
			this.prisma.user.count({ where }),
		])

		return {
			total,
			usersData: usersData.map((u) => ({
				id: u.id,
				email: u.email,
				name: u.name,
				role: u.role,
				status: u.status,
				isSuperAdmin: u.is_super_admin,
				createdAt: u.created_at.toISOString(),
			})),
		}
	}

	public async countUserStats(): Promise<UserStatsOutput> {
		const [total, members, admins, active, inactive] = await Promise.all([
			this.prisma.user.count({ where: { deleted_at: null } }),
			this.prisma.user.count({ where: { deleted_at: null, role: "MEMBER" } }),
			this.prisma.user.count({ where: { deleted_at: null, role: "ADMIN" } }),
			this.prisma.user.count({
				where: { deleted_at: null, status: $Enums.UserStatus.activated },
			}),
			this.prisma.user.count({
				where: { deleted_at: null, status: $Enums.UserStatus.suspended },
			}),
		])
		return { total, members, admins, active, inactive }
	}

	private buildWhereClause(input: FetchUsersInput) {
		const statusValue = this.resolveStatusValue(input.status)
		return {
			deleted_at: null,
			...(input.query && {
				OR: [
					{ name: { contains: input.query, mode: "insensitive" as const } },
					{ email: { contains: input.query, mode: "insensitive" as const } },
				],
			}),
			...(input.role && { role: input.role }),
			...(statusValue && { status: statusValue }),
		}
	}

	private resolveStatusValue(
		status: FetchUsersInput["status"],
	): $Enums.UserStatus | undefined {
		if (status === "active") return $Enums.UserStatus.activated
		if (status === "inactive") return $Enums.UserStatus.suspended
		return undefined
	}
}
