import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import {
	AnalyticsPeriod,
	type InvalidPeriodError,
} from "../../domain/value-object/analytics-period"
import type {
	AnalyticsUserRepository,
	GrowthAnalytics,
} from "../repository/analytics-user-repository"

export interface FetchGrowthAnalyticsInput {
	period: string
}

export type FetchGrowthAnalyticsOutput = Either<
	InvalidPeriodError,
	GrowthAnalytics
>

@injectable()
export class FetchGrowthAnalyticsUseCase {
	constructor(
		@inject(ANALYTICS_TYPES.Repositories.AnalyticsUser)
		private readonly userRepository: AnalyticsUserRepository,
	) {}

	public async execute(
		input: FetchGrowthAnalyticsInput,
	): Promise<FetchGrowthAnalyticsOutput> {
		const periodResult = AnalyticsPeriod.fromKey(input.period)
		if (periodResult.isFailure()) {
			return failure(periodResult.forceFailure().value)
		}
		const period = periodResult.forceSuccess().value
		const analytics = await this.userRepository.fetchGrowthAnalytics(period)
		return success(analytics)
	}
}
