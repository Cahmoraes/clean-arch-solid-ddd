import { inject, injectable } from "inversify"
import type {
	Prisma,
	PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	PlanRepository,
	SavePlanResult,
} from "@/subscription/application/repository/plan-repository"
import { type BillingPeriod, Plan } from "@/subscription/domain/plan"
import { PrismaUnitOfWork } from "../unit-of-work/prisma-unit-of-work"

export interface PlanRow {
	id: string
	name: string
	price_cents: number
	billing_period: string
	tagline: string
	features: string[]
	is_active: boolean
	stripe_price_id: string | null
}

@injectable()
export class PrismaPlanRepository implements PlanRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(prismaClient: TX): PlanRepository {
		if (PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			return new PrismaPlanRepository(prismaClient)
		}
		throw new InvalidTransactionInstance(prismaClient)
	}

	public async save(plan: Plan): Promise<SavePlanResult> {
		const result = await this.prismaClient.plan.create({
			data: {
				id: plan.id,
				name: plan.name,
				price_cents: plan.priceCents,
				billing_period: plan.billingPeriod,
				tagline: plan.tagline,
				features: [...plan.features],
				is_active: plan.isActive,
				stripe_price_id: plan.stripePriceId,
			},
			select: { id: true },
		})
		return { id: result.id }
	}

	public async update(plan: Plan): Promise<void> {
		await this.prismaClient.plan.update({
			where: { id: plan.id },
			data: {
				name: plan.name,
				price_cents: plan.priceCents,
				billing_period: plan.billingPeriod,
				tagline: plan.tagline,
				features: [...plan.features],
				is_active: plan.isActive,
				stripe_price_id: plan.stripePriceId,
			},
		})
	}

	public async planOfId(id: string): Promise<Plan | null> {
		const row = await this.prismaClient.plan.findUnique({ where: { id } })
		if (!row) return null
		return this.createPlan(row)
	}

	public async fetchPlans(): Promise<Plan[]> {
		const rows = await this.prismaClient.plan.findMany()
		return rows.map((row) => this.createPlan(row))
	}

	public async fetchActivePlans(): Promise<Plan[]> {
		const rows = await this.prismaClient.plan.findMany({
			where: { is_active: true },
		})
		return rows.map((row) => this.createPlan(row))
	}

	private createPlan(row: PlanRow): Plan {
		return Plan.restore({
			id: row.id,
			name: row.name,
			priceCents: row.price_cents,
			billingPeriod: row.billing_period as BillingPeriod,
			tagline: row.tagline,
			features: row.features,
			isActive: row.is_active,
			stripePriceId: row.stripe_price_id ?? "",
		})
	}
}
