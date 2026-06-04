import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"

export interface AtRiskMember {
	id: string
	name: string
	daysSinceLastCheckIn: number
}

export interface RetentionAnalytics {
	activeCount: number
	inactiveCount: number
	churnRate: number
	atRiskMembers: AtRiskMember[]
}

export interface PeriodCount {
	date: string
	count: number
}

export interface GrowthAnalytics {
	totalMembers: number
	newMembersCount: number
	newMembersPerPeriod: PeriodCount[]
	activeMembersTrend: PeriodCount[]
}

export interface AnalyticsUserRepository {
	fetchRetentionAnalytics(period: AnalyticsPeriod): Promise<RetentionAnalytics>
	fetchGrowthAnalytics(period: AnalyticsPeriod): Promise<GrowthAnalytics>
}
