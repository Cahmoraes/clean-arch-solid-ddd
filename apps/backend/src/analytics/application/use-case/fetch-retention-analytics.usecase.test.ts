import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { InMemoryAnalyticsUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import { FetchRetentionAnalyticsUseCase } from "./fetch-retention-analytics.usecase"

describe("FetchRetentionAnalyticsUseCase", () => {
	let sut: FetchRetentionAnalyticsUseCase

	beforeEach(() => {
		container.snapshot()
		container
			.rebind(ANALYTICS_TYPES.Repositories.AnalyticsUser)
			.toConstantValue(new InMemoryAnalyticsUserRepository())
		container
			.rebind(ANALYTICS_TYPES.UseCases.FetchRetentionAnalytics)
			.to(FetchRetentionAnalyticsUseCase)
		sut = container.get<FetchRetentionAnalyticsUseCase>(
			ANALYTICS_TYPES.UseCases.FetchRetentionAnalytics,
		)
	})

	afterEach(() => {
		container.restore()
	})

	test("deve retornar analytics de retenção para período válido", async () => {
		const result = await sut.execute({ period: "30d" })
		expect(result.isSuccess()).toBe(true)
		const analytics = result.forceSuccess().value
		expect(analytics).toMatchObject({
			activeCount: expect.any(Number),
			inactiveCount: expect.any(Number),
			churnRate: expect.any(Number),
			atRiskMembers: expect.any(Array),
		})
	})

	test("deve retornar falha para período inválido", async () => {
		const result = await sut.execute({ period: "invalid" })
		expect(result.isFailure()).toBe(true)
	})
})
