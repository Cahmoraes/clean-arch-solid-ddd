import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryPlanRepository } from "@/shared/infra/database/repository/in-memory/in-memory-plan-repository"
import { InvalidPlanNameError } from "@/subscription/domain/error/invalid-plan-name-error"
import { InvalidPriceError } from "@/subscription/domain/error/invalid-price-error"
import { CreatePlanUseCase } from "./create-plan.usecase"

const VALID_INPUT = {
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly" as const,
	tagline: "Acesso ilimitado a todas as academias parceiras.",
	features: ["Check-ins ilimitados"],
}

describe("CreatePlanUseCase", () => {
	let planRepository: InMemoryPlanRepository
	let sut: CreatePlanUseCase

	beforeEach(() => {
		planRepository = new InMemoryPlanRepository()
		sut = new CreatePlanUseCase(planRepository)
	})

	test("deve criar um plano com sucesso e persisti-lo no repositório", async () => {
		const result = await sut.execute(VALID_INPUT)

		expect(result.isSuccess()).toBe(true)
		const plan = result.forceSuccess().value
		expect(plan.name).toBe("Premium Mensal")
		const saved = await planRepository.planOfId(plan.id)
		expect(saved).not.toBeNull()
	})

	test("deve rejeitar preço negativo com InvalidPriceError e não persistir nada", async () => {
		const result = await sut.execute({ ...VALID_INPUT, priceCents: -1 })

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidPriceError)
		expect(planRepository.plans.size).toBe(0)
	})

	test("deve rejeitar nome vazio com InvalidPlanNameError e não persistir nada", async () => {
		const result = await sut.execute({ ...VALID_INPUT, name: "" })

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidPlanNameError)
		expect(planRepository.plans.size).toBe(0)
	})
})
