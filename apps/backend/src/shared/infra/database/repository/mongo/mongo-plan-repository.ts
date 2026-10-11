import { inject, injectable } from "inversify"
import type { ClientSession, Collection } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { PlanNotPersistedError } from "@/shared/infra/errors/plan-not-persisted-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	PlanRepository,
	SavePlanResult,
} from "@/subscription/application/repository/plan-repository"
import { type BillingPeriod, Plan } from "@/subscription/domain/plan"

export type PlanDocument = {
	_id: string
	name: string
	price_cents: number
	billing_period: BillingPeriod
	tagline: string
	features: string[]
	is_active: boolean
	stripe_price_id: string | null
	created_at: Date
	updated_at: Date
}

@injectable()
export class MongoPlanRepository implements PlanRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): PlanRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoPlanRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(plan: Plan): Promise<SavePlanResult> {
		const now = new Date()
		await this.plans().insertOne(
			{
				_id: plan.id,
				name: plan.name,
				price_cents: plan.priceCents,
				billing_period: plan.billingPeriod,
				tagline: plan.tagline,
				features: [...plan.features],
				is_active: plan.isActive,
				stripe_price_id: plan.stripePriceId,
				created_at: now,
				updated_at: now,
			},
			sessionOptions(this.session),
		)
		return { id: plan.id }
	}

	public async update(plan: Plan): Promise<void> {
		const result = await this.plans().updateOne(
			{ _id: plan.id },
			{
				$set: {
					name: plan.name,
					price_cents: plan.priceCents,
					billing_period: plan.billingPeriod,
					tagline: plan.tagline,
					features: [...plan.features],
					is_active: plan.isActive,
					stripe_price_id: plan.stripePriceId,
					updated_at: new Date(),
				},
			},
			sessionOptions(this.session),
		)
		if (result.matchedCount === 0) throw new PlanNotPersistedError(plan.id)
	}

	public async planOfId(id: string): Promise<Plan | null> {
		const document = await this.plans().findOne(
			{ _id: id },
			sessionOptions(this.session),
		)
		return document ? this.createPlan(document) : null
	}

	public async fetchPlans(): Promise<Plan[]> {
		const documents = await this.plans()
			.find({}, sessionOptions(this.session))
			.sort({ created_at: 1, _id: 1 })
			.toArray()
		return documents.map((document) => this.createPlan(document))
	}

	public async fetchActivePlans(): Promise<Plan[]> {
		const documents = await this.plans()
			.find({ is_active: true }, sessionOptions(this.session))
			.sort({ created_at: 1, _id: 1 })
			.toArray()
		return documents.map((document) => this.createPlan(document))
	}

	public async planOfStripePriceId(priceId: string): Promise<Plan | null> {
		if (!priceId) return null
		const document = await this.plans().findOne(
			{ stripe_price_id: priceId },
			sessionOptions(this.session),
		)
		return document ? this.createPlan(document) : null
	}

	private plans(): Collection<PlanDocument> {
		return this.connection.collection<PlanDocument>(COLLECTIONS.PLANS)
	}

	private createPlan(document: PlanDocument): Plan {
		return Plan.restore({
			id: document._id,
			name: document.name,
			priceCents: document.price_cents,
			billingPeriod: document.billing_period,
			tagline: document.tagline,
			features: document.features,
			isActive: document.is_active,
			stripePriceId: document.stripe_price_id ?? "",
		})
	}
}
