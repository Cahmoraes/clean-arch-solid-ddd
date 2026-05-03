import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { InMemoryStripeWebhookEventRepository } from "@/shared/infra/database/repository/in-memory/in-memory-stripe-webhook-event-repository"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { TestingUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/testing-unit-of-work"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import { QueueMemoryAdapter } from "@/shared/infra/queue/queue-memory-adapter"
import { QUEUES } from "@/shared/infra/queue/queues"
import { Subscription } from "@/subscription/domain/subscription"
import { User } from "@/user/domain/user"
import type { ActivateSubscriptionUseCase } from "../../application/use-case/activate-subscription.usecase"
import type { CancelSubscriptionUseCase } from "../../application/use-case/cancel-subscription.usecase"
import type { HandlePaymentFailedUseCase } from "../../application/use-case/handle-payment-failed.usecase"

import {
	type StripeWebhookQueuePayload,
	StripeWebhookWorker,
} from "./stripe-webhook-worker"

function makePayload(
	eventId: string,
	eventType: string,
	data: Record<string, unknown>,
): StripeWebhookQueuePayload {
	return {
		eventId,
		eventType,
		eventData: {
			id: eventId,
			type: eventType,
			data: { object: data },
		} as unknown as StripeWebhookQueuePayload["eventData"],
	}
}

describe("StripeWebhookWorker", () => {
	let sut: StripeWebhookWorker
	let queue: QueueMemoryAdapter
	let webhookEventRepo: InMemoryStripeWebhookEventRepository
	let subscriptionRepository: InMemorySubscriptionRepository
	let userRepository: InMemoryUserRepository
	let activateSubscription: ActivateSubscriptionUseCase
	let cancelSubscription: CancelSubscriptionUseCase
	let handlePaymentFailed: HandlePaymentFailedUseCase
	let logger: Logger

	beforeEach(async () => {
		container.snapshot()
		const repos = setupInMemoryRepositories()
		subscriptionRepository = repos.subscriptionRepository
		userRepository = repos.userRepository

		queue = new QueueMemoryAdapter()
		webhookEventRepo = new InMemoryStripeWebhookEventRepository()
		const unitOfWork = new TestingUnitOfWork()

		activateSubscription = container.get<ActivateSubscriptionUseCase>(
			SUBSCRIPTION_TYPES.USE_CASES.ActivateSubscription,
		)
		cancelSubscription = container.get<CancelSubscriptionUseCase>(
			SUBSCRIPTION_TYPES.USE_CASES.CancelSubscription,
		)
		handlePaymentFailed = container.get<HandlePaymentFailedUseCase>(
			SUBSCRIPTION_TYPES.USE_CASES.HandlePaymentFailed,
		)
		logger = container.get<Logger>(SHARED_TYPES.Logger)

		sut = new StripeWebhookWorker(
			queue,
			unitOfWork,
			webhookEventRepo,
			subscriptionRepository,
			activateSubscription,
			cancelSubscription,
			handlePaymentFailed,
			logger,
		)
		await sut.init()
	})

	afterEach(() => {
		container.restore()
	})

	async function triggerHandler(payload: StripeWebhookQueuePayload) {
		const handlers = queue.queues.get(QUEUES.STRIPE_WEBHOOK)
		expect(handlers).toBeDefined()
		if (!handlers) throw new Error("Stripe webhook handler not registered")
		await handlers[0](payload)
	}

	async function createUserAndSubscription(opts: {
		userId: string
		email: string
		billingSubscriptionId: string
		customerId: string
		userStatus?: "activated" | "suspended"
		subscriptionStatus?: "active" | "canceled" | "incomplete" | "past_due"
	}) {
		const userOrError = await User.create({
			id: opts.userId,
			name: "Test User",
			email: opts.email,
			password: "any_password",
			status: opts.userStatus ?? "activated",
		})
		const user = userOrError.forceSuccess().value
		await userRepository.save(user)

		const subscription = Subscription.create({
			id: `sub-${opts.userId}`,
			userId: opts.userId,
			billingSubscriptionId: opts.billingSubscriptionId,
			customerId: opts.customerId,
			status: opts.subscriptionStatus ?? "active",
		})
		await subscriptionRepository.save(subscription)
		return { user, subscription }
	}

	it("deve chamar ActivateSubscriptionUseCase para customer.subscription.updated com status active", async () => {
		await createUserAndSubscription({
			userId: "user-1",
			email: "user1@test.com",
			billingSubscriptionId: "sub_stripe_active",
			customerId: "cus_1",
			userStatus: "suspended",
			subscriptionStatus: "incomplete",
		})

		const executeActivateSpy = vi.spyOn(activateSubscription, "execute")

		const payload = makePayload(
			"evt_activate_001",
			"customer.subscription.updated",
			{ id: "sub_stripe_active", status: "active" },
		)

		await triggerHandler(payload)

		expect(executeActivateSpy).toHaveBeenCalledOnce()
		expect(executeActivateSpy).toHaveBeenCalledWith(
			{ billingSubscriptionId: "sub_stripe_active" },
			expect.anything(),
		)

		const updatedSubscription =
			await subscriptionRepository.ofBillingSubscriptionId("sub_stripe_active")
		expect(updatedSubscription?.status).toBe("active")

		const updatedUser = await userRepository.userOfId("user-1")
		expect(updatedUser?.isActive).toBe(true)
	})

	it("deve chamar CancelSubscriptionUseCase para customer.subscription.updated com status canceled", async () => {
		await createUserAndSubscription({
			userId: "user-2",
			email: "user2@test.com",
			billingSubscriptionId: "sub_stripe_cancel",
			customerId: "cus_2",
			userStatus: "activated",
			subscriptionStatus: "active",
		})

		const executeCancelSpy = vi.spyOn(cancelSubscription, "execute")

		const payload = makePayload(
			"evt_cancel_001",
			"customer.subscription.updated",
			{ id: "sub_stripe_cancel", status: "canceled" },
		)

		await triggerHandler(payload)

		expect(executeCancelSpy).toHaveBeenCalledOnce()
		expect(executeCancelSpy).toHaveBeenCalledWith(
			{ billingSubscriptionId: "sub_stripe_cancel" },
			expect.anything(),
		)

		const updatedSubscription =
			await subscriptionRepository.ofBillingSubscriptionId("sub_stripe_cancel")
		expect(updatedSubscription?.status).toBe("canceled")

		const updatedUser = await userRepository.userOfId("user-2")
		expect(updatedUser?.isSuspend).toBe(true)
	})

	it("deve chamar CancelSubscriptionUseCase para customer.subscription.deleted", async () => {
		await createUserAndSubscription({
			userId: "user-3",
			email: "user3@test.com",
			billingSubscriptionId: "sub_stripe_deleted",
			customerId: "cus_3",
			userStatus: "activated",
			subscriptionStatus: "active",
		})

		const executeCancelSpy = vi.spyOn(cancelSubscription, "execute")

		const payload = makePayload(
			"evt_delete_001",
			"customer.subscription.deleted",
			{ id: "sub_stripe_deleted", status: "canceled" },
		)

		await triggerHandler(payload)

		expect(executeCancelSpy).toHaveBeenCalledOnce()
		expect(executeCancelSpy).toHaveBeenCalledWith(
			{ billingSubscriptionId: "sub_stripe_deleted" },
			expect.anything(),
		)

		const updatedSubscription =
			await subscriptionRepository.ofBillingSubscriptionId("sub_stripe_deleted")
		expect(updatedSubscription?.status).toBe("canceled")
	})

	it("deve chamar HandlePaymentFailedUseCase para invoice.payment_failed", async () => {
		await createUserAndSubscription({
			userId: "user-4",
			email: "user4@test.com",
			billingSubscriptionId: "sub_stripe_payment_failed",
			customerId: "cus_payment_failed",
			userStatus: "activated",
			subscriptionStatus: "active",
		})

		const executeHandleSpy = vi.spyOn(handlePaymentFailed, "execute")

		const payload = makePayload("evt_payment_001", "invoice.payment_failed", {
			customer: "cus_payment_failed",
		})

		await triggerHandler(payload)

		expect(executeHandleSpy).toHaveBeenCalledOnce()
		expect(executeHandleSpy).toHaveBeenCalledWith(
			{ customerId: "cus_payment_failed" },
			expect.anything(),
		)

		const updatedSubscription =
			await subscriptionRepository.ofCustomerId("cus_payment_failed")
		expect(updatedSubscription?.status).toBe("past_due")

		const updatedUser = await userRepository.userOfId("user-4")
		expect(updatedUser?.isSuspend).toBe(true)
	})

	it("não deve chamar nenhum use case para tipo de evento não mapeado", async () => {
		const executeActivateSpy = vi.spyOn(activateSubscription, "execute")
		const executeCancelSpy = vi.spyOn(cancelSubscription, "execute")
		const executeHandleSpy = vi.spyOn(handlePaymentFailed, "execute")

		const payload = makePayload(
			"evt_unknown_001",
			"invoice.payment_succeeded",
			{
				id: "sub_unknown",
			},
		)

		await triggerHandler(payload)

		expect(executeActivateSpy).not.toHaveBeenCalled()
		expect(executeCancelSpy).not.toHaveBeenCalled()
		expect(executeHandleSpy).not.toHaveBeenCalled()
	})

	it("deve ignorar silenciosamente evento duplicado sem chamar nenhum use case", async () => {
		await createUserAndSubscription({
			userId: "user-5",
			email: "user5@test.com",
			billingSubscriptionId: "sub_stripe_dup",
			customerId: "cus_5",
			userStatus: "suspended",
			subscriptionStatus: "incomplete",
		})

		const executeActivateSpy = vi.spyOn(activateSubscription, "execute")

		const payload = makePayload(
			"evt_dup_001",
			"customer.subscription.updated",
			{ id: "sub_stripe_dup", status: "active" },
		)

		await triggerHandler(payload)
		expect(executeActivateSpy).toHaveBeenCalledOnce()
		expect(webhookEventRepo.processedEvents.size).toBe(1)

		executeActivateSpy.mockClear()

		await triggerHandler(payload)

		expect(executeActivateSpy).not.toHaveBeenCalled()
		expect(webhookEventRepo.processedEvents.size).toBe(1)
	})

	it("não deve propagar exceção quando o use case lança erro", async () => {
		const executeActivateSpy = vi
			.spyOn(activateSubscription, "execute")
			.mockRejectedValueOnce(new Error("Erro técnico simulado"))

		const payload = makePayload(
			"evt_error_001",
			"customer.subscription.updated",
			{ id: "sub_stripe_error", status: "active" },
		)

		await expect(triggerHandler(payload)).resolves.not.toThrow()
		expect(executeActivateSpy).toHaveBeenCalledOnce()
	})

	describe("customer.subscription.created (reconciliação)", () => {
		it("deve criar nova Subscription localmente quando ainda não existe", async () => {
			const userOrError = await User.create({
				id: "user-created-1",
				name: "User Created 1",
				email: "created1@test.com",
				password: "any_password",
			})
			await userRepository.save(userOrError.forceSuccess().value)

			const payload = makePayload(
				"evt_created_001",
				"customer.subscription.created",
				{
					id: "sub_stripe_created",
					customer: "cus_created_1",
					status: "incomplete",
					metadata: { userId: "user-created-1" },
				},
			)

			await triggerHandler(payload)

			const saved =
				await subscriptionRepository.ofBillingSubscriptionId(
					"sub_stripe_created",
				)
			expect(saved).not.toBeNull()
			expect(saved?.userId).toBe("user-created-1")
			expect(saved?.customerId).toBe("cus_created_1")
			expect(saved?.billingSubscriptionId).toBe("sub_stripe_created")
			expect(saved?.status).toBe("incomplete")
		})

		it("deve ignorar silenciosamente quando a Subscription já existe localmente (idempotência)", async () => {
			await createUserAndSubscription({
				userId: "user-created-2",
				email: "created2@test.com",
				billingSubscriptionId: "sub_stripe_existing",
				customerId: "cus_existing",
				userStatus: "activated",
				subscriptionStatus: "active",
			})
			const beforeCount = subscriptionRepository.data.size

			const payload = makePayload(
				"evt_created_002",
				"customer.subscription.created",
				{
					id: "sub_stripe_existing",
					customer: "cus_existing_other",
					status: "incomplete",
					metadata: { userId: "user-created-2" },
				},
			)

			await triggerHandler(payload)

			expect(subscriptionRepository.data.size).toBe(beforeCount)
			const saved = await subscriptionRepository.ofBillingSubscriptionId(
				"sub_stripe_existing",
			)
			expect(saved?.customerId).toBe("cus_existing")
			expect(saved?.status).toBe("active")
		})

		it("deve extrair customerId quando customer é objeto expandido", async () => {
			const userOrError = await User.create({
				id: "user-created-3",
				name: "User Created 3",
				email: "created3@test.com",
				password: "any_password",
			})
			await userRepository.save(userOrError.forceSuccess().value)

			const payload = makePayload(
				"evt_created_003",
				"customer.subscription.created",
				{
					id: "sub_stripe_created_3",
					customer: { id: "cus_created_3" },
					status: "incomplete",
					metadata: { userId: "user-created-3" },
				},
			)

			await triggerHandler(payload)

			const saved = await subscriptionRepository.ofBillingSubscriptionId(
				"sub_stripe_created_3",
			)
			expect(saved?.customerId).toBe("cus_created_3")
		})
	})
})
