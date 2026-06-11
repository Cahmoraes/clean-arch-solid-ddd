import type {
	AnalyticsCheckInRepository,
	CheckInAnalytics,
} from "@/analytics/application/repository/analytics-check-in-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"

export class InMemoryAnalyticsCheckInRepository
	implements AnalyticsCheckInRepository
{
	async fetchCheckInAnalytics(
		_period: AnalyticsPeriod,
	): Promise<CheckInAnalytics> {
		return {
			totalCheckIns: 0,
			dailySeries: [],
			hourlyDistribution: [],
		}
	}
}
