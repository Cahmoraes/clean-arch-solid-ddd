import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { Subscription } from "@/subscription/domain/subscription"
import { User } from "@/user/domain/user"

import { SubscriptionNotFoundError } from "../error/subscription-not-found-error"
import type { HandlePaymentFailedUseCase } from "./handle-payment-failed.usecase"

describe("HandlePaymentFailedUseCase", () => {
	let sut: HandlePaymentFailedUseCase
	let subscriptionRepository: InMemorySubscriptionRepository
	let userRepository: InMemoryUserRepository

	beforeEach(async () => {
		container.snapshot()
		const repos = setupInMemoryRepositories()
		subscriptionRepository = repos.subscriptionRepository
		userRepository = repos.userRepository
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.HandlePaymentFailed)
	})

	afterEach(() => {
		container.restore()
	})

	it("deve marcar subscription como past_due e suspender usuário quando encontrados", async () => {
		const userOrError = await User.create({
			id: "user-id-1",
			name: "any_name",
			email: "user@test.com",
			password: "any_password",
			status: "activated",
		})
		const user = userOrError.forceSuccess().value
		await userRepository.save(user)

		const subscription = Subscription.create({
			id: "sub-id-1",
			userId: "user-id-1",
			billingSubscriptionId: "sub_stripe_123",
			customerId: "cus_123",
			status: "active",
		})
		await subscriptionRepository.save(subscription)

		const updateSubSpy = vi.spyOn(subscriptionRepository, "update")
		const updateUserSpy = vi.spyOn(userRepository, "update")

		const result = await sut.execute({ customerId: "cus_123" })

		expect(result.isSuccess()).toBe(true)

		const updatedSubscription =
			await subscriptionRepository.ofCustomerId("cus_123")
		expect(updatedSubscription?.status).toBe("past_due")
		expect(updatedSubscription?.updatedAt).toBeDefined()
		expect(updatedSubscription?.canceledAt).toBeUndefined()

		const updatedUser = await userRepository.userOfId("user-id-1")
		expect(updatedUser?.isSuspend).toBe(true)

		expect(updateSubSpy).toHaveBeenCalledOnce()
		expect(updateUserSpy).toHaveBeenCalledOnce()
	})

	it("deve retornar SubscriptionNotFoundError quando assinatura não encontrada", async () => {
		const result = await sut.execute({ customerId: "cus_inexistente" })

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(SubscriptionNotFoundError)
	})

	it("deve ser idempotente: marcar past_due em subscription já past_due não causa erro", async () => {
		const userOrError = await User.create({
			id: "user-id-2",
			name: "any_name",
			email: "user2@test.com",
			password: "any_password",
			status: "suspended",
		})
		const user = userOrError.forceSuccess().value
		await userRepository.save(user)

		const subscription = Subscription.create({
			id: "sub-id-2",
			userId: "user-id-2",
			billingSubscriptionId: "sub_stripe_456",
			customerId: "cus_456",
			status: "past_due",
		})
		await subscriptionRepository.save(subscription)

		const result = await sut.execute({ customerId: "cus_456" })

		expect(result.isSuccess()).toBe(true)
	})

	it("deve garantir que canceledAt permanece indefinido após markAsPastDue", async () => {
		const userOrError = await User.create({
			id: "user-id-3",
			name: "any_name",
			email: "user3@test.com",
			password: "any_password",
			status: "activated",
		})
		const user = userOrError.forceSuccess().value
		await userRepository.save(user)

		const subscription = Subscription.create({
			id: "sub-id-3",
			userId: "user-id-3",
			billingSubscriptionId: "sub_stripe_789",
			customerId: "cus_789",
			status: "active",
		})
		await subscriptionRepository.save(subscription)

		await sut.execute({ customerId: "cus_789" })

		const updatedSubscription =
			await subscriptionRepository.ofCustomerId("cus_789")
		expect(updatedSubscription?.canceledAt).toBeUndefined()
	})

	it("deve usar withTransaction quando tx fornecido", async () => {
		const userOrError = await User.create({
			id: "user-id-4",
			name: "any_name",
			email: "user4@test.com",
			password: "any_password",
			status: "activated",
		})
		const user = userOrError.forceSuccess().value
		await userRepository.save(user)

		const subscription = Subscription.create({
			id: "sub-id-4",
			userId: "user-id-4",
			billingSubscriptionId: "sub_stripe_abc",
			customerId: "cus_abc",
			status: "active",
		})
		await subscriptionRepository.save(subscription)

		const withTxSpy = vi.spyOn(subscriptionRepository, "withTransaction")
		const withUserTxSpy = vi.spyOn(userRepository, "withTransaction")

		const tx = {}
		const result = await sut.execute({ customerId: "cus_abc" }, tx)

		expect(result.isSuccess()).toBe(true)
		expect(withTxSpy).toHaveBeenCalledWith(tx)
		expect(withUserTxSpy).toHaveBeenCalledWith(tx)
	})
})
