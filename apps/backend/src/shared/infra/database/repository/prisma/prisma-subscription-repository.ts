import { inject, injectable } from "inversify"
import type {
	Prisma,
	PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { PrismaUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { ActiveSubscriptionAlreadyExistsError } from "@/subscription/domain/error/active-subscription-already-exists-error.js"
import { Subscription } from "@/subscription/domain/subscription"
import type { SubscriptionStatusTypes } from "@/subscription/domain/subscription-status-types"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"

const ACTIVE_SUBSCRIPTION_INDEX = "subscriptions_user_id_active_key"

interface SubscriptionData {
	id: string
	user_id: string
	billing_subscription_id: string
	customer_id: string
	status: SubscriptionStatusTypes
	plan_id: string | null
	current_period_start: Date
	current_period_end: Date
	cancel_at_period_end: boolean
	canceled_at: Date | null
	created_at: Date
	updated_at: Date
}

@injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(
		prismaClient: TX,
	): SubscriptionRepository {
		if (!PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			throw new InvalidTransactionInstance(prismaClient)
		}
		return new PrismaSubscriptionRepository(prismaClient)
	}

	public async save(subscription: Subscription): Promise<void> {
		try {
			await this.prisma.subscription.create({
				data: {
					id: subscription.id,
					user_id: subscription.userId,
					billing_subscription_id: subscription.billingSubscriptionId,
					customer_id: subscription.customerId,
					status: subscription.status,
					plan_id: subscription.planId ?? null,
					current_period_start: subscription.currentPeriodStart,
					current_period_end: subscription.currentPeriodEnd,
					cancel_at_period_end: subscription.cancelAtPeriodEnd,
					canceled_at: subscription.canceledAt ?? null,
					created_at: subscription.createdAt,
				},
			})
		} catch (error) {
			if (this.isActiveSubscriptionIndexViolation(error)) {
				throw new ActiveSubscriptionAlreadyExistsError({ cause: error })
			}
			throw error
		}
	}

	public async update(subscription: Subscription): Promise<void> {
		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				status: subscription.status,
				plan_id: subscription.planId ?? null,
				cancel_at_period_end: subscription.cancelAtPeriodEnd,
				canceled_at: subscription.canceledAt ?? null,
				updated_at: subscription.updatedAt ?? new Date(),
			},
		})
	}

	public async ofBillingSubscriptionId(
		billingSubscriptionId: string,
	): Promise<Subscription | null> {
		const data = await this.prisma.subscription.findUnique({
			where: { billing_subscription_id: billingSubscriptionId },
		})
		if (!data) return null
		return this.restore(data as SubscriptionData)
	}

	public async ofCustomerId(customerId: string): Promise<Subscription | null> {
		const data = await this.prisma.subscription.findFirst({
			where: { customer_id: customerId },
		})
		if (!data) return null
		return this.restore(data as SubscriptionData)
	}

	public async ofUserId(userId: string): Promise<Subscription | null> {
		const data = await this.prisma.subscription.findFirst({
			where: { user_id: userId, status: "active" },
		})
		if (!data) return null
		return this.restore(data as SubscriptionData)
	}

	private isActiveSubscriptionIndexViolation(error: unknown): boolean {
		if (!(error instanceof Error)) return false
		if (error.message.includes(ACTIVE_SUBSCRIPTION_INDEX)) return true
		// yagni: Prisma (driver adapters) reports the Postgres constraint name only
		// inside `meta.driverAdapterError.cause.originalMessage`, not in `error.message`.
		// Stringifying `meta` keeps this working across the differing shapes Prisma
		// versions have used for that nested error, without parsing all of them.
		const meta = (error as { meta?: unknown }).meta
		return JSON.stringify(meta ?? "").includes(ACTIVE_SUBSCRIPTION_INDEX)
	}

	private restore(data: SubscriptionData): Subscription {
		return Subscription.restore({
			id: data.id,
			userId: data.user_id,
			billingSubscriptionId: data.billing_subscription_id,
			customerId: data.customer_id,
			status: data.status,
			planId: data.plan_id ?? undefined,
			currentPeriodStart: data.current_period_start,
			currentPeriodEnd: data.current_period_end,
			cancelAtPeriodEnd: data.cancel_at_period_end,
			canceledAt: data.canceled_at ?? undefined,
			createdAt: data.created_at,
			updatedAt: data.updated_at,
		})
	}
}
