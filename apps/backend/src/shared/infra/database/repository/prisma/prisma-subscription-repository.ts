import { inject, injectable } from "inversify"
import type {
	Prisma,
	PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { PrismaUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { Subscription } from "@/subscription/domain/subscription"
import type { SubscriptionStatusTypes } from "@/subscription/domain/subscription-status-types"
import type { SubscriptionRepository } from "@/subscription/repository/subscription-repository"

interface SubscriptionData {
	id: string
	user_id: string
	billing_subscription_id: string
	customer_id: string
	status: SubscriptionStatusTypes
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
		await this.prisma.subscription.create({
			data: {
				id: subscription.id,
				user_id: subscription.userId,
				billing_subscription_id: subscription.billingSubscriptionId,
				customer_id: subscription.customerId,
				status: subscription.status,
				canceled_at: subscription.canceledAt ?? null,
				created_at: subscription.createdAt,
			},
		})
	}

	public async update(subscription: Subscription): Promise<void> {
		await this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				status: subscription.status,
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

	private restore(data: SubscriptionData): Subscription {
		return Subscription.restore({
			id: data.id,
			userId: data.user_id,
			billingSubscriptionId: data.billing_subscription_id,
			customerId: data.customer_id,
			status: data.status,
			canceledAt: data.canceled_at ?? undefined,
			createdAt: data.created_at,
			updatedAt: data.updated_at,
		})
	}
}
