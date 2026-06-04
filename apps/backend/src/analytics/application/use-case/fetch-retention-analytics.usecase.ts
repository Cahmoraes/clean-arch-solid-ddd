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
	RetentionAnalytics,
} from "../repository/analytics-user-repository"

export interface FetchRetentionAnalyticsInput {
	period: string
}

export type FetchRetentionAnalyticsOutput = Either<
	InvalidPeriodError,
	RetentionAnalytics
>

@injectable()
export class FetchRetentionAnalyticsUseCase {
	constructor(
		@inject(ANALYTICS_TYPES.Repositories.AnalyticsUser)
		private readonly userRepository: AnalyticsUserRepository,
	) {}

	public async execute(
		input: FetchRetentionAnalyticsInput,
	): Promise<FetchRetentionAnalyticsOutput> {
		const periodResult = AnalyticsPeriod.fromKey(input.period)
		if (periodResult.isFailure()) {
			return failure(periodResult.forceFailure().value)
		}
		const period = periodResult.forceSuccess().value
		const analytics = await this.userRepository.fetchRetentionAnalytics(period)
		return success(analytics)
	}
}
