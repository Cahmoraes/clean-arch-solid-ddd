import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { InMemoryAnalyticsUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import { FetchGrowthAnalyticsUseCase } from "./fetch-growth-analytics.usecase"

describe("FetchGrowthAnalyticsUseCase", () => {
	let sut: FetchGrowthAnalyticsUseCase

	beforeEach(() => {
		container.snapshot()
		container
			.rebind(ANALYTICS_TYPES.Repositories.AnalyticsUser)
			.toConstantValue(new InMemoryAnalyticsUserRepository())
		container
			.rebind(ANALYTICS_TYPES.UseCases.FetchGrowthAnalytics)
			.to(FetchGrowthAnalyticsUseCase)
		sut = container.get<FetchGrowthAnalyticsUseCase>(
			ANALYTICS_TYPES.UseCases.FetchGrowthAnalytics,
		)
	})

	afterEach(() => {
		container.restore()
	})

	test("deve retornar analytics de crescimento para período válido", async () => {
		const result = await sut.execute({ period: "12m" })
		expect(result.isSuccess()).toBe(true)
		const analytics = result.forceSuccess().value
		expect(analytics).toMatchObject({
			totalMembers: expect.any(Number),
			newMembersCount: expect.any(Number),
			newMembersPerPeriod: expect.any(Array),
			activeMembersTrend: expect.any(Array),
		})
	})

	test("deve retornar falha para período inválido", async () => {
		const result = await sut.execute({ period: "invalid" })
		expect(result.isFailure()).toBe(true)
	})
})
