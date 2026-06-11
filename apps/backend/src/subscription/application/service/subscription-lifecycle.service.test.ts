import { beforeEach, describe, expect, it, vi } from "vitest"
import { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { Subscription } from "@/subscription/domain/subscription"
import { User } from "@/user/domain/user"
import { SubscriptionNotFoundError } from "../error/subscription-not-found-error"
import { SubscriptionLifecycleServiceImpl } from "./subscription-lifecycle.service"

describe("SubscriptionLifecycleService", () => {
	let sut: SubscriptionLifecycleServiceImpl
	let subscriptionRepository: InMemorySubscriptionRepository
	let userRepository: InMemoryUserRepository

	beforeEach(() => {
		subscriptionRepository = new InMemorySubscriptionRepository()
		userRepository = new InMemoryUserRepository()
		sut = new SubscriptionLifecycleServiceImpl(
			subscriptionRepository,
			userRepository,
		)
	})

	it("activate() deve ativar subscription e usuário", async () => {
		await saveUser({ id: "user-id-1", status: "suspended" })
		await subscriptionRepository.save(
			Subscription.create({
				id: "sub-id-1",
				userId: "user-id-1",
				billingSubscriptionId: "sub_stripe_123",
				customerId: "cus_123",
				status: "incomplete",
			}),
		)

		const result = await sut.activate({
			billingSubscriptionId: "sub_stripe_123",
		})

		expect(result.isSuccess()).toBe(true)
		expect(result.value).toBeNull()

		const updatedSubscription =
			await subscriptionRepository.ofBillingSubscriptionId("sub_stripe_123")
		expect(updatedSubscription?.status).toBe("active")

		const updatedUser = await userRepository.userOfId("user-id-1")
		expect(updatedUser?.isActive).toBe(true)
	})

	it("cancel() deve suspender usuário e cancelar subscription", async () => {
		await saveUser({ id: "user-id-2", status: "activated" })
		await subscriptionRepository.save(
			Subscription.create({
				id: "sub-id-2",
				userId: "user-id-2",
				billingSubscriptionId: "sub_stripe_456",
				customerId: "cus_456",
				status: "active",
			}),
		)

		const result = await sut.cancel({ billingSubscriptionId: "sub_stripe_456" })

		expect(result.isSuccess()).toBe(true)
		expect(result.value).toBeNull()

		const updatedSubscription =
			await subscriptionRepository.ofBillingSubscriptionId("sub_stripe_456")
		expect(updatedSubscription?.status).toBe("canceled")
		expect(updatedSubscription?.canceledAt).toBeDefined()

		const updatedUser = await userRepository.userOfId("user-id-2")
		expect(updatedUser?.isSuspend).toBe(true)
	})

	it("handlePaymentFailed() deve suspender usuário e marcar subscription como past_due", async () => {
		await saveUser({ id: "user-id-3", status: "activated" })
		await subscriptionRepository.save(
			Subscription.create({
				id: "sub-id-3",
				userId: "user-id-3",
				billingSubscriptionId: "sub_stripe_789",
				customerId: "cus_789",
				status: "active",
			}),
		)

		const result = await sut.handlePaymentFailed({ customerId: "cus_789" })

		expect(result.isSuccess()).toBe(true)
		expect(result.value).toBeNull()

		const updatedSubscription =
			await subscriptionRepository.ofCustomerId("cus_789")
		expect(updatedSubscription?.status).toBe("past_due")
		expect(updatedSubscription?.canceledAt).toBeUndefined()

		const updatedUser = await userRepository.userOfId("user-id-3")
		expect(updatedUser?.isSuspend).toBe(true)
	})

	it("activate() deve retornar failure quando subscription não existir", async () => {
		const result = await sut.activate({
			billingSubscriptionId: "sub_inexistente",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(SubscriptionNotFoundError)
	})

	it("cancel() deve lançar erro técnico quando user não for encontrado", async () => {
		await subscriptionRepository.save(
			Subscription.create({
				id: "sub-id-5",
				userId: "user-id-ausente",
				billingSubscriptionId: "sub_stripe_ausente",
				customerId: "cus_ausente",
				status: "active",
			}),
		)

		await expect(
			sut.cancel({ billingSubscriptionId: "sub_stripe_ausente" }),
		).rejects.toThrow(
			"User user-id-ausente not found for subscription sub-id-5",
		)
	})

	it("deve propagar tx via withTransaction para ambos os repositories", async () => {
		await saveUser({ id: "user-id-6", status: "suspended" })
		await subscriptionRepository.save(
			Subscription.create({
				id: "sub-id-6",
				userId: "user-id-6",
				billingSubscriptionId: "sub_stripe_tx",
				customerId: "cus_tx",
				status: "incomplete",
			}),
		)

		const subscriptionWithTransactionSpy = vi.spyOn(
			subscriptionRepository,
			"withTransaction",
		)
		const userWithTransactionSpy = vi.spyOn(userRepository, "withTransaction")
		const tx = {}

		const result = await sut.activate(
			{ billingSubscriptionId: "sub_stripe_tx" },
			tx,
		)

		expect(result.isSuccess()).toBe(true)
		expect(subscriptionWithTransactionSpy).toHaveBeenCalledWith(tx)
		expect(userWithTransactionSpy).toHaveBeenCalledWith(tx)
	})

	async function saveUser(input: {
		id: string
		status: "activated" | "suspended"
	}): Promise<void> {
		const userOrError = await User.create({
			id: input.id,
			name: "any_name",
			email: `${input.id}@test.com`,
			password: "any_password",
			status: input.status,
		})
		await userRepository.save(userOrError.forceSuccess().value)
	}
})
