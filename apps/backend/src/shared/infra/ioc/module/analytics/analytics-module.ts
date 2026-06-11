import { ContainerModule } from "inversify"
import { FetchCheckInAnalyticsUseCase } from "@/analytics/application/use-case/fetch-check-in-analytics.usecase"
import { FetchGrowthAnalyticsUseCase } from "@/analytics/application/use-case/fetch-growth-analytics.usecase"
import { FetchRetentionAnalyticsUseCase } from "@/analytics/application/use-case/fetch-retention-analytics.usecase"
import { FetchCheckInAnalyticsController } from "@/analytics/infra/http/controller/fetch-check-in-analytics.controller"
import { FetchGrowthAnalyticsController } from "@/analytics/infra/http/controller/fetch-growth-analytics.controller"
import { FetchRetentionAnalyticsController } from "@/analytics/infra/http/controller/fetch-retention-analytics.controller"
import { ANALYTICS_TYPES } from "../../types"
import { AnalyticsCheckInRepositoryProvider } from "./analytics-check-in-repository-provider"
import { AnalyticsUserRepositoryProvider } from "./analytics-user-repository-provider"

export const analyticsModule = new ContainerModule(({ bind }) => {
	bind(ANALYTICS_TYPES.Repositories.AnalyticsCheckIn)
		.toDynamicValue(AnalyticsCheckInRepositoryProvider.provide)
		.inSingletonScope()

	bind(ANALYTICS_TYPES.Repositories.AnalyticsUser)
		.toDynamicValue(AnalyticsUserRepositoryProvider.provide)
		.inSingletonScope()

	bind(ANALYTICS_TYPES.UseCases.FetchCheckInAnalytics).to(
		FetchCheckInAnalyticsUseCase,
	)
	bind(ANALYTICS_TYPES.UseCases.FetchRetentionAnalytics).to(
		FetchRetentionAnalyticsUseCase,
	)
	bind(ANALYTICS_TYPES.UseCases.FetchGrowthAnalytics).to(
		FetchGrowthAnalyticsUseCase,
	)

	bind(ANALYTICS_TYPES.Controllers.FetchCheckInAnalytics).to(
		FetchCheckInAnalyticsController,
	)
	bind(ANALYTICS_TYPES.Controllers.FetchRetentionAnalytics).to(
		FetchRetentionAnalyticsController,
	)
	bind(ANALYTICS_TYPES.Controllers.FetchGrowthAnalytics).to(
		FetchGrowthAnalyticsController,
	)
})
