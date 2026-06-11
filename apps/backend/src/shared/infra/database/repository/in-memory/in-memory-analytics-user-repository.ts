import type {
	AnalyticsUserRepository,
	GrowthAnalytics,
	RetentionAnalytics,
} from "@/analytics/application/repository/analytics-user-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"

export class InMemoryAnalyticsUserRepository
	implements AnalyticsUserRepository
{
	async fetchRetentionAnalytics(
		_period: AnalyticsPeriod,
	): Promise<RetentionAnalytics> {
		return {
			activeCount: 0,
			inactiveCount: 0,
			churnRate: 0,
			atRiskMembers: [],
		}
	}

	async fetchGrowthAnalytics(
		_period: AnalyticsPeriod,
	): Promise<GrowthAnalytics> {
		return {
			totalMembers: 0,
			newMembersCount: 0,
			newMembersPerPeriod: [],
			activeMembersTrend: [],
		}
	}
}
