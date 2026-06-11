import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { InMemoryAnalyticsCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-check-in-repository"
import { container } from "@/shared/infra/ioc/container"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import { FetchCheckInAnalyticsUseCase } from "./fetch-check-in-analytics.usecase"

describe("FetchCheckInAnalyticsUseCase", () => {
	let sut: FetchCheckInAnalyticsUseCase

	beforeEach(() => {
		container.snapshot()
		container
			.rebind(ANALYTICS_TYPES.Repositories.AnalyticsCheckIn)
			.toConstantValue(new InMemoryAnalyticsCheckInRepository())
		container
			.rebind(ANALYTICS_TYPES.UseCases.FetchCheckInAnalytics)
			.to(FetchCheckInAnalyticsUseCase)
		sut = container.get<FetchCheckInAnalyticsUseCase>(
			ANALYTICS_TYPES.UseCases.FetchCheckInAnalytics,
		)
	})

	afterEach(() => {
		container.restore()
	})

	test("deve retornar analytics para período válido '30d'", async () => {
		const result = await sut.execute({ period: "30d" })
		expect(result.isSuccess()).toBe(true)
		const analytics = result.forceSuccess().value
		expect(analytics).toMatchObject({
			totalCheckIns: expect.any(Number),
			dailySeries: expect.any(Array),
			hourlyDistribution: expect.any(Array),
		})
	})

	test("deve retornar falha para período inválido", async () => {
		const result = await sut.execute({ period: "invalid" })
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value.message).toContain("inválido")
	})

	test("deve aceitar todos os períodos válidos", async () => {
		for (const period of ["7d", "30d", "3m", "12m"]) {
			const result = await sut.execute({ period })
			expect(result.isSuccess()).toBe(true)
		}
	})
})
