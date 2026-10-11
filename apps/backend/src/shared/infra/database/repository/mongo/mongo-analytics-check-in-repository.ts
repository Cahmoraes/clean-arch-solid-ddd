import { inject, injectable } from "inversify"
import type {
	AnalyticsCheckInRepository,
	CheckInAnalytics,
	DailyCount,
	HourlyCount,
} from "@/analytics/application/repository/analytics-check-in-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

@injectable()
export class MongoAnalyticsCheckInRepository
	implements AnalyticsCheckInRepository
{
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async fetchCheckInAnalytics(
		period: AnalyticsPeriod,
	): Promise<CheckInAnalytics> {
		const { from, to } = period
		const checkIns = this.connection.collection<CheckInDocument>(
			COLLECTIONS.CHECK_INS,
		)
		const match = { created_at: { $gte: from, $lte: to } }

		const [totalCheckIns, dailySeries, hourlyDistribution] = await Promise.all([
			checkIns.countDocuments(match),
			checkIns
				.aggregate<{ _id: string; count: number }>([
					{ $match: match },
					{
						$group: {
							_id: {
								$dateToString: {
									format: "%Y-%m-%d",
									date: "$created_at",
									timezone: "UTC",
								},
							},
							count: { $sum: 1 },
						},
					},
					{ $sort: { _id: 1 } },
				])
				.toArray(),
			checkIns
				.aggregate<{ _id: number; count: number }>([
					{ $match: match },
					{
						$group: {
							_id: { $hour: { date: "$created_at", timezone: "UTC" } },
							count: { $sum: 1 },
						},
					},
					{ $sort: { _id: 1 } },
				])
				.toArray(),
		])

		return {
			totalCheckIns,
			dailySeries: dailySeries.map(
				(row): DailyCount => ({ date: row._id, count: row.count }),
			),
			hourlyDistribution: hourlyDistribution.map(
				(row): HourlyCount => ({ hour: row._id, count: row.count }),
			),
		}
	}
}
