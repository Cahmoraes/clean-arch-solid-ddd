import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"

import { type ModuleControllers, resolve } from "./server-build"

export function setupAnalyticsModule(): ModuleControllers {
	const controllers = [
		resolve(ANALYTICS_TYPES.Controllers.FetchCheckInAnalytics),
		resolve(ANALYTICS_TYPES.Controllers.FetchRetentionAnalytics),
		resolve(ANALYTICS_TYPES.Controllers.FetchGrowthAnalytics),
	]
	return { controllers }
}
