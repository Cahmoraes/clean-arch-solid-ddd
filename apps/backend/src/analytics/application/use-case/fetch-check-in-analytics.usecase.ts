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
	AnalyticsCheckInRepository,
	CheckInAnalytics,
} from "../repository/analytics-check-in-repository"

export interface FetchCheckInAnalyticsInput {
	period: string
}

export type FetchCheckInAnalyticsOutput = Either<
	InvalidPeriodError,
	CheckInAnalytics
>

@injectable()
export class FetchCheckInAnalyticsUseCase {
	constructor(
		@inject(ANALYTICS_TYPES.Repositories.AnalyticsCheckIn)
		private readonly checkInRepository: AnalyticsCheckInRepository,
	) {}

	public async execute(
		input: FetchCheckInAnalyticsInput,
	): Promise<FetchCheckInAnalyticsOutput> {
		const periodResult = AnalyticsPeriod.fromKey(input.period)
		if (periodResult.isFailure()) {
			return failure(periodResult.forceFailure().value)
		}
		const period = periodResult.forceSuccess().value
		const analytics = await this.checkInRepository.fetchCheckInAnalytics(period)
		return success(analytics)
	}
}
