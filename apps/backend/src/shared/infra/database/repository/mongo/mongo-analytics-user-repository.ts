import { inject, injectable } from "inversify"
import type { Document } from "mongodb"
import type {
	AnalyticsUserRepository,
	AtRiskMember,
	GrowthAnalytics,
	PeriodCount,
	RetentionAnalytics,
} from "@/analytics/application/repository/analytics-user-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

const DAY_MS = 24 * 3_600_000
const AT_RISK_LIMIT = 50

type CountRow = { count: number }
type BucketRow = { _id: string; count: number }
type AtRiskRow = { _id: string; name: string; last_check_in: Date }

@injectable()
export class MongoAnalyticsUserRepository implements AnalyticsUserRepository {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
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
		const checkIns = this.checkIns()

		const [activeRows, atRiskRows, totalUsers] = await Promise.all([
			checkIns
				.aggregate<CountRow>([
					{ $match: { created_at: { $gte: thirtyDaysAgo } } },
					{ $group: { _id: "$user_id" } },
					{ $count: "count" },
				])
				.toArray(),
			checkIns
				.aggregate<AtRiskRow>([
					{
						$group: { _id: "$user_id", last_check_in: { $max: "$created_at" } },
					},
					{ $match: { last_check_in: { $lt: fourteenDaysAgo } } },
					{
						$lookup: {
							from: COLLECTIONS.USERS,
							localField: "_id",
							foreignField: "_id",
							as: "user",
						},
					},
					{ $unwind: "$user" },
					{ $sort: { last_check_in: 1, _id: 1 } },
					{ $limit: AT_RISK_LIMIT },
					{ $project: { name: "$user.name", last_check_in: 1 } },
				])
				.toArray(),
			this.users().countDocuments({}),
		])

		const activeCount = activeRows[0]?.count ?? 0
		const inactiveCount = Math.max(0, totalUsers - activeCount)
		const churnRate = totalUsers > 0 ? (inactiveCount / totalUsers) * 100 : 0
		const now = Date.now()

		return {
			activeCount,
			inactiveCount,
			churnRate: Math.round(churnRate * 100) / 100,
			atRiskMembers: atRiskRows.map(
				(row): AtRiskMember => ({
					id: row._id,
					name: row.name,
					daysSinceLastCheckIn: Math.floor(
						(now - row.last_check_in.getTime()) / DAY_MS,
					),
				}),
			),
		}
	}

	public async fetchGrowthAnalytics(
		period: AnalyticsPeriod,
	): Promise<GrowthAnalytics> {
		const { from, to } = period
		const bucket = this.bucketExpression(period.shouldAggregateByWeek())
		const rangeMatch = { created_at: { $gte: from, $lte: to } }

		const [
			totalMembers,
			newMembersCount,
			newMembersPerPeriod,
			activeMembersTrend,
		] = await Promise.all([
			this.users().countDocuments({ created_at: { $lte: to } }),
			this.users().countDocuments(rangeMatch),
			this.users()
				.aggregate<BucketRow>([
					{ $match: rangeMatch },
					{ $group: { _id: bucket, count: { $sum: 1 } } },
					{ $sort: { _id: 1 } },
				])
				.toArray(),
			this.checkIns()
				.aggregate<BucketRow>([
					{ $match: rangeMatch },
					{ $group: { _id: { bucket, user: "$user_id" } } },
					{ $group: { _id: "$_id.bucket", count: { $sum: 1 } } },
					{ $sort: { _id: 1 } },
				])
				.toArray(),
		])

		return {
			totalMembers,
			newMembersCount,
			newMembersPerPeriod: newMembersPerPeriod.map(
				(row): PeriodCount => ({ date: row._id, count: row.count }),
			),
			activeMembersTrend: activeMembersTrend.map(
				(row): PeriodCount => ({ date: row._id, count: row.count }),
			),
		}
	}

	private bucketExpression(byWeek: boolean): Document {
		const truncate: Document = {
			date: "$created_at",
			unit: byWeek ? "week" : "day",
			timezone: "UTC",
		}
		if (byWeek) truncate.startOfWeek = "monday"
		return {
			$dateToString: {
				format: "%Y-%m-%d",
				timezone: "UTC",
				date: { $dateTrunc: truncate },
			},
		}
	}

	private users() {
		return this.connection.collection<UserDocument>(COLLECTIONS.USERS)
	}

	private checkIns() {
		return this.connection.collection<CheckInDocument>(COLLECTIONS.CHECK_INS)
	}
}
