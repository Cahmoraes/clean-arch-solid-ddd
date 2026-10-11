import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { PlanRepository } from "@/subscription/application/repository/plan-repository"
import { Plan } from "@/subscription/domain/plan"

export interface PlanRepositoryContractContext {
	repository: PlanRepository
	newId(): string
	cleanup(): Promise<void>
}

type PlanProps = Parameters<typeof Plan.restore>[0]

export function describePlanRepositoryContract(
	name: string,
	factory: () => Promise<PlanRepositoryContractContext>,
): void {
	describe(`PlanRepository contract (${name})`, () => {
		let context: PlanRepositoryContractContext

		beforeEach(async () => {
			context = await factory()
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildPlan(overrides: Partial<PlanProps> = {}): Plan {
			const id = overrides.id ?? context.newId()
			return Plan.restore({
				id,
				name: "Contract Plan",
				priceCents: 1990,
				billingPeriod: "monthly",
				tagline: "Plano de contrato",
				features: ["acesso", "relatórios"],
				isActive: true,
				stripePriceId: `price_${id}`,
				...overrides,
			})
		}

		it("saves a plan and finds it by id", async () => {
			const plan = buildPlan()

			const saved = await context.repository.save(plan)
			const found = await context.repository.planOfId(plan.id)

			expect(saved).toEqual({ id: plan.id })
			expect(found?.name).toBe("Contract Plan")
			expect(found?.priceCents).toBe(1990)
			expect(found?.billingPeriod).toBe("monthly")
			expect(found?.tagline).toBe("Plano de contrato")
			expect([...(found?.features ?? [])]).toEqual(["acesso", "relatórios"])
			expect(found?.isActive).toBe(true)
			expect(found?.stripePriceId).toBe(plan.stripePriceId)
		})

		it("returns null for an unknown id", async () => {
			expect(await context.repository.planOfId(context.newId())).toBeNull()
		})

		it("update persists the changed fields", async () => {
			const id = context.newId()
			await context.repository.save(buildPlan({ id }))

			await context.repository.update(
				buildPlan({
					id,
					name: "Renamed Plan",
					priceCents: 2990,
					isActive: false,
				}),
			)

			const found = await context.repository.planOfId(id)
			expect(found?.name).toBe("Renamed Plan")
			expect(found?.priceCents).toBe(2990)
			expect(found?.isActive).toBe(false)
		})

		it("update of a plan that does not exist rejects", async () => {
			await expect(context.repository.update(buildPlan())).rejects.toThrow()
		})

		it("fetchPlans lists every plan and fetchActivePlans only the active ones", async () => {
			const active = buildPlan()
			const inactive = buildPlan({ isActive: false })
			await context.repository.save(active)
			await context.repository.save(inactive)
			const ours = new Set([active.id, inactive.id])

			const all = await context.repository.fetchPlans()
			const onlyActive = await context.repository.fetchActivePlans()

			expect(
				all
					.filter((plan) => ours.has(plan.id))
					.map((plan) => plan.id)
					.sort(),
			).toEqual([active.id, inactive.id].sort())
			expect(
				onlyActive.filter((plan) => ours.has(plan.id)).map((plan) => plan.id),
			).toEqual([active.id])
		})

		it("planOfStripePriceId finds the plan by price id and ignores an empty price id", async () => {
			const plan = buildPlan()
			await context.repository.save(plan)

			const found = await context.repository.planOfStripePriceId(
				plan.stripePriceId,
			)

			expect(found?.id).toBe(plan.id)
			expect(await context.repository.planOfStripePriceId("")).toBeNull()
		})
	})
}
