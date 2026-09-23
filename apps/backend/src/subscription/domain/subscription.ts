import { randomUUID } from "node:crypto"
import { computePeriodEnd } from "./compute-period-end"
import { SubscriptionCancellationScheduledError } from "./error/subscription-cancellation-scheduled-error.js"
import type { BillingPeriod } from "./plan"
import type { SubscriptionStatusTypes } from "./subscription-status-types"

export type SubscriptionState = "active" | "cancel_scheduled" | "expired"

export interface SubscriptionConstructor {
	id: string
	userId: string
	billingSubscriptionId: string
	customerId: string
	status: SubscriptionStatusTypes
	planId?: string
	currentPeriodStart: Date
	currentPeriodEnd: Date
	cancelAtPeriodEnd: boolean
	createdAt: Date
	updatedAt?: Date
	canceledAt?: Date
}

export interface SubscriptionCreate {
	id?: string
	userId: string
	billingSubscriptionId: string
	customerId: string
	status: SubscriptionStatusTypes
	planId?: string
	billingPeriod?: BillingPeriod
	currentPeriodStart?: Date
}

export interface SubscriptionRestore {
	id: string
	userId: string
	billingSubscriptionId: string
	customerId: string
	status: SubscriptionStatusTypes
	planId?: string
	currentPeriodStart?: Date
	currentPeriodEnd?: Date
	cancelAtPeriodEnd?: boolean
	createdAt: Date
	updatedAt?: Date
	canceledAt?: Date
}

export class Subscription {
	private readonly _id: string
	private readonly _userId: string
	private readonly _billingSubscriptionId: string
	private readonly _customerId: string
	private _status: SubscriptionStatusTypes
	private _planId?: string
	private readonly _currentPeriodStart: Date
	private readonly _currentPeriodEnd: Date
	private _cancelAtPeriodEnd: boolean
	private readonly _createdAt: Date
	private _updatedAt?: Date
	private _canceledAt?: Date

	private constructor(props: SubscriptionConstructor) {
		this._id = props.id
		this._userId = props.userId
		this._billingSubscriptionId = props.billingSubscriptionId
		this._customerId = props.customerId
		this._status = props.status
		this._planId = props.planId
		this._currentPeriodStart = props.currentPeriodStart
		this._currentPeriodEnd = props.currentPeriodEnd
		this._cancelAtPeriodEnd = props.cancelAtPeriodEnd
		this._createdAt = props.createdAt
		this._updatedAt = props.updatedAt
		this._canceledAt = props.canceledAt
	}

	public static create(props: SubscriptionCreate): Subscription {
		const createdAt = new Date()
		const currentPeriodStart = props.currentPeriodStart ?? createdAt
		return new Subscription({
			id: props.id ?? randomUUID(),
			userId: props.userId,
			billingSubscriptionId: props.billingSubscriptionId,
			customerId: props.customerId,
			status: props.status,
			planId: props.planId,
			currentPeriodStart,
			currentPeriodEnd: computePeriodEnd(
				currentPeriodStart,
				props.billingPeriod ?? "monthly",
			),
			cancelAtPeriodEnd: false,
			createdAt,
		})
	}

	public static restore(props: SubscriptionRestore): Subscription {
		return new Subscription({
			...props,
			currentPeriodStart: props.currentPeriodStart ?? props.createdAt,
			currentPeriodEnd:
				props.currentPeriodEnd ?? computePeriodEnd(props.createdAt, "monthly"),
			cancelAtPeriodEnd: props.cancelAtPeriodEnd ?? false,
		})
	}

	public get id(): string {
		return this._id
	}

	public get userId(): string {
		return this._userId
	}

	public get billingSubscriptionId(): string {
		return this._billingSubscriptionId
	}

	public get customerId(): string {
		return this._customerId
	}

	public get status(): SubscriptionStatusTypes {
		return this._status
	}

	public get planId(): string | undefined {
		return this._planId
	}

	public get currentPeriodStart(): Date {
		return this._currentPeriodStart
	}

	public get currentPeriodEnd(): Date {
		return this._currentPeriodEnd
	}

	public get cancelAtPeriodEnd(): boolean {
		return this._cancelAtPeriodEnd
	}

	public get createdAt(): Date {
		return this._createdAt
	}

	public get updatedAt(): Date | undefined {
		return this._updatedAt
	}

	public get canceledAt(): Date | undefined {
		return this._canceledAt
	}

	public changeStatus(newStatus: SubscriptionStatusTypes): void {
		this._status = newStatus
	}

	public activate(): void {
		this._status = "active"
		this._updatedAt = new Date()
	}

	public cancel(): void {
		this._status = "canceled"
		this._canceledAt = new Date()
		this._updatedAt = new Date()
	}

	public markAsPastDue(): void {
		this._status = "past_due"
		this._updatedAt = new Date()
	}

	public assertCanChangePlan(): void {
		if (this._cancelAtPeriodEnd) {
			throw new SubscriptionCancellationScheduledError()
		}
	}

	public changePlan(planId: string, now: Date = new Date()): void {
		this.assertCanChangePlan()
		this._planId = planId
		this._updatedAt = now
	}

	public scheduleCancellation(now: Date = new Date()): void {
		if (this._cancelAtPeriodEnd) return
		this._cancelAtPeriodEnd = true
		this._updatedAt = now
	}

	public isExpired(now: Date): boolean {
		return (
			this._cancelAtPeriodEnd &&
			now.getTime() >= this._currentPeriodEnd.getTime()
		)
	}

	public resolveState(now: Date): SubscriptionState {
		if (this.isExpired(now)) return "expired"
		return this._cancelAtPeriodEnd ? "cancel_scheduled" : "active"
	}

	public closeExpired(now: Date = new Date()): void {
		this._status = "canceled"
		this._canceledAt = this._currentPeriodEnd
		this._updatedAt = now
	}
}
