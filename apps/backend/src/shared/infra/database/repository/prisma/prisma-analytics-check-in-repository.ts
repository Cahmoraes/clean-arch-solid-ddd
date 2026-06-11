import { inject, injectable } from "inversify"
import type {
	AnalyticsCheckInRepository,
	CheckInAnalytics,
	DailyCount,
	HourlyCount,
} from "@/analytics/application/repository/analytics-check-in-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

@injectable()
export class PrismaAnalyticsCheckInRepository
	implements AnalyticsCheckInRepository
{
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient,
	) {}

	public async fetchCheckInAnalytics(
		period: AnalyticsPeriod,
	): Promise<CheckInAnalytics> {
		const { from, to } = period

		const [totalResult, dailySeries, hourlyDistribution] = await Promise.all([
			this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "check_ins"
        WHERE created_at >= ${from} AND created_at <= ${to}
      `,
			this.prismaClient.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
          COUNT(*) as count
        FROM "check_ins"
        WHERE created_at >= ${from} AND created_at <= ${to}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
			this.prismaClient.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*) as count
        FROM "check_ins"
        WHERE created_at >= ${from} AND created_at <= ${to}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `,
		])

		return {
			totalCheckIns: Number(totalResult[0]?.count ?? 0),
			dailySeries: dailySeries.map(
				(row): DailyCount => ({ date: row.date, count: Number(row.count) }),
			),
			hourlyDistribution: hourlyDistribution.map(
				(row): HourlyCount => ({ hour: row.hour, count: Number(row.count) }),
			),
		}
	}
}
