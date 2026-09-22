import { randomUUID } from "node:crypto"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { InvalidPlanNameError } from "./error/invalid-plan-name-error.js"
import { InvalidPriceError } from "./error/invalid-price-error.js"

export const BILLING_PERIODS = ["monthly", "yearly"] as const
export type BillingPeriod = (typeof BILLING_PERIODS)[number]

export interface PlanCreateProps {
	id?: string
	name: string
	priceCents: number
	billingPeriod: BillingPeriod
	tagline: string
	features: ReadonlyArray<string>
	stripePriceId?: string
}

export interface PlanRestoreProps {
	id: string
	name: string
	priceCents: number
	billingPeriod: BillingPeriod
	tagline: string
	features: ReadonlyArray<string>
	isActive: boolean
	stripePriceId: string
}

export class Plan {
	private constructor(private readonly props: PlanRestoreProps) {}

	static create(
		props: PlanCreateProps,
	): Either<InvalidPlanNameError | InvalidPriceError, Plan> {
		const name = props.name.trim()
		if (name.length === 0) return failure(new InvalidPlanNameError())
		if (props.priceCents < 0) return failure(new InvalidPriceError())

		return success(
			new Plan({
				id: props.id ?? randomUUID(),
				name,
				priceCents: props.priceCents,
				billingPeriod: props.billingPeriod,
				tagline: props.tagline,
				features: props.features,
				isActive: true,
				stripePriceId: props.stripePriceId ?? "",
			}),
		)
	}

	static restore(props: PlanRestoreProps): Plan {
		return new Plan(props)
	}

	get id(): string {
		return this.props.id
	}

	get name(): string {
		return this.props.name
	}

	get priceCents(): number {
		return this.props.priceCents
	}

	get billingPeriod(): BillingPeriod {
		return this.props.billingPeriod
	}

	get tagline(): string {
		return this.props.tagline
	}

	get features(): ReadonlyArray<string> {
		return this.props.features
	}

	get isActive(): boolean {
		return this.props.isActive
	}

	get stripePriceId(): string {
		return this.props.stripePriceId
	}

	public inactivate(): Plan {
		return new Plan({ ...this.props, isActive: false })
	}

	public reactivate(): Plan {
		return new Plan({ ...this.props, isActive: true })
	}
}
