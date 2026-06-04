import { inject, injectable } from "inversify"
import type {
	AnalyticsUserRepository,
	AtRiskMember,
	GrowthAnalytics,
	PeriodCount,
	RetentionAnalytics,
} from "@/analytics/application/repository/analytics-user-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

@injectable()
export class PrismaAnalyticsUserRepository implements AnalyticsUserRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient,
	) {}

	// Retention windows are fixed by business definition: active = last 30 days, at-risk = no check-in in 14 days.
	// The period parameter is part of the repository contract but intentionally unused here.
	public async fetchRetentionAnalytics(
		_period: AnalyticsPeriod,
	): Promise<RetentionAnalytics> {
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
		const fourteenDaysAgo = new Date()
		fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

		const [activeResult, atRiskResult, totalUsersResult] = await Promise.all([
			this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT user_id) as count
        FROM "check_ins"
        WHERE created_at >= ${thirtyDaysAgo}
      `,
			this.prismaClient.$queryRaw<
				Array<{ id: string; name: string; days_since: number }>
			>`
        SELECT
          u.id,
          u.name,
          EXTRACT(DAY FROM NOW() - MAX(c.created_at))::int AS days_since
        FROM "users" u
        JOIN "check_ins" c ON c.user_id = u.id
        GROUP BY u.id, u.name
        HAVING MAX(c.created_at) < ${fourteenDaysAgo}
        ORDER BY days_since DESC
        LIMIT 50
      `,
			this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "users"
      `,
		])

		const totalUsers = Number(totalUsersResult[0]?.count ?? 0)
		const activeCount = Number(activeResult[0]?.count ?? 0)
		const inactiveCount = Math.max(0, totalUsers - activeCount)
		const churnRate = totalUsers > 0 ? (inactiveCount / totalUsers) * 100 : 0

		return {
			activeCount,
			inactiveCount,
			churnRate: Math.round(churnRate * 100) / 100,
			atRiskMembers: atRiskResult.map(
				(row): AtRiskMember => ({
					id: row.id,
					name: row.name,
					daysSinceLastCheckIn: row.days_since,
				}),
			),
		}
	}

	public async fetchGrowthAnalytics(
		period: AnalyticsPeriod,
	): Promise<GrowthAnalytics> {
		const { from, to } = period
		const truncUnit = period.shouldAggregateByWeek() ? "week" : "day"

		const [
			totalResult,
			newMembersResult,
			newMembersPerPeriodResult,
			activeTrendResult,
		] = await Promise.all([
			this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM "users" WHERE created_at <= ${to}
        `,
			this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM "users"
          WHERE created_at >= ${from} AND created_at <= ${to}
        `,
			this.prismaClient.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT
            TO_CHAR(DATE_TRUNC(${truncUnit}, created_at), 'YYYY-MM-DD') as date,
            COUNT(*) as count
          FROM "users"
          WHERE created_at >= ${from} AND created_at <= ${to}
          GROUP BY DATE_TRUNC(${truncUnit}, created_at)
          ORDER BY DATE_TRUNC(${truncUnit}, created_at)
        `,
			this.prismaClient.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT
            TO_CHAR(DATE_TRUNC(${truncUnit}, c.created_at), 'YYYY-MM-DD') as date,
            COUNT(DISTINCT c.user_id) as count
          FROM "check_ins" c
          WHERE c.created_at >= ${from} AND c.created_at <= ${to}
          GROUP BY DATE_TRUNC(${truncUnit}, c.created_at)
          ORDER BY DATE_TRUNC(${truncUnit}, c.created_at)
        `,
		])

		return {
			totalMembers: Number(totalResult[0]?.count ?? 0),
			newMembersCount: Number(newMembersResult[0]?.count ?? 0),
			newMembersPerPeriod: newMembersPerPeriodResult.map(
				(row): PeriodCount => ({ date: row.date, count: Number(row.count) }),
			),
			activeMembersTrend: activeTrendResult.map(
				(row): PeriodCount => ({ date: row.date, count: Number(row.count) }),
			),
		}
	}
}
