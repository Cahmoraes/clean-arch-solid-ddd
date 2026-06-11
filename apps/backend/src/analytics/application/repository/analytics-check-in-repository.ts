import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"

export interface DailyCount {
	date: string
	count: number
}

export interface HourlyCount {
	hour: number
	count: number
}

export interface CheckInAnalytics {
	totalCheckIns: number
	dailySeries: DailyCount[]
	hourlyDistribution: HourlyCount[]
}

export interface AnalyticsCheckInRepository {
	fetchCheckInAnalytics(period: AnalyticsPeriod): Promise<CheckInAnalytics>
}
