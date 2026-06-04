export const ANALYTICS_TYPES = {
	Repositories: {
		AnalyticsCheckIn: Symbol.for("AnalyticsCheckInRepository"),
		AnalyticsUser: Symbol.for("AnalyticsUserRepository"),
	},
	UseCases: {
		FetchCheckInAnalytics: Symbol.for("FetchCheckInAnalyticsUseCase"),
		FetchRetentionAnalytics: Symbol.for("FetchRetentionAnalyticsUseCase"),
		FetchGrowthAnalytics: Symbol.for("FetchGrowthAnalyticsUseCase"),
	},
	Controllers: {
		FetchCheckInAnalytics: Symbol.for("FetchCheckInAnalyticsController"),
		FetchRetentionAnalytics: Symbol.for("FetchRetentionAnalyticsController"),
		FetchGrowthAnalytics: Symbol.for("FetchGrowthAnalyticsController"),
	},
} as const
