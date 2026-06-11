import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { InMemorySubscriptionRepository } from "@/shared/infra/database/repository/in-memory/in-memory-subscription-repository"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { Subscription } from "@/subscription/domain/subscription"
import { User } from "@/user/domain/user"
import { SubscriptionNotFoundError } from "../error/subscription-not-found-error"
import type { ActivateSubscriptionUseCase } from "./activate-subscription.usecase"

describe("ActivateSubscriptionUseCase", () => {
	let sut: ActivateSubscriptionUseCase
	let subscriptionRepository: InMemorySubscriptionRepository
	let userRepository: InMemoryUserRepository

	beforeEach(async () => {
		container.snapshot()
		const repos = setupInMemoryRepositories()
		subscriptionRepository = repos.subscriptionRepository
		userRepository = repos.userRepository
		sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.ActivateSubscription)
	})

	afterEach(() => {
		container.restore()
	})

	it("deve ativar subscription e usuário quando encontrados", async () => {
		const userOrError = await User.create({
			id: "user-id-1",
			name: "any_name",
			email: "user@test.com",
			password: "any_password",
			status: "suspended",
		})
		const user = userOrError.forceSuccess().value
		await userRepository.save(user)

		const subscription = Subscription.create({
			id: "sub-id-1",
			userId: "user-id-1",
			billingSubscriptionId: "sub_stripe_123",
			customerId: "cus_123",
			status: "incomplete",
		})
		await subscriptionRepository.save(subscription)

		const updateSubSpy = vi.spyOn(subscriptionRepository, "update")
		const updateUserSpy = vi.spyOn(userRepository, "update")

		const result = await sut.execute({
			billingSubscriptionId: "sub_stripe_123",
		})

		expect(result.isSuccess()).toBe(true)

		const updatedSubscription =
			await subscriptionRepository.ofBillingSubscriptionId("sub_stripe_123")
		expect(updatedSubscription?.status).toBe("active")
		expect(updatedSubscription?.updatedAt).toBeDefined()

		const updatedUser = await userRepository.userOfId("user-id-1")
		expect(updatedUser?.isActive).toBe(true)

		expect(updateSubSpy).toHaveBeenCalledOnce()
		expect(updateUserSpy).toHaveBeenCalledOnce()
	})

	it("deve retornar SubscriptionNotFoundError quando assinatura não encontrada", async () => {
		const result = await sut.execute({
			billingSubscriptionId: "sub_inexistente",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(SubscriptionNotFoundError)
	})

	it("deve ser idempotente: ativar subscription já ativa não causa erro", async () => {
		const userOrError = await User.create({
			id: "user-id-2",
			name: "any_name",
			email: "user2@test.com",
			password: "any_password",
			status: "activated",
		})
		const user = userOrError.forceSuccess().value
		await userRepository.save(user)

		const subscription = Subscription.create({
			id: "sub-id-2",
			userId: "user-id-2",
			billingSubscriptionId: "sub_stripe_456",
			customerId: "cus_456",
			status: "active",
		})
		await subscriptionRepository.save(subscription)

		const result = await sut.execute({
			billingSubscriptionId: "sub_stripe_456",
		})

		expect(result.isSuccess()).toBe(true)
	})

	it("deve usar withTransaction quando tx fornecido", async () => {
		const userOrError = await User.create({
			id: "user-id-3",
			name: "any_name",
			email: "user3@test.com",
			password: "any_password",
			status: "suspended",
		})
		const user = userOrError.forceSuccess().value
		await userRepository.save(user)

		const subscription = Subscription.create({
			id: "sub-id-3",
			userId: "user-id-3",
			billingSubscriptionId: "sub_stripe_789",
			customerId: "cus_789",
			status: "incomplete",
		})
		await subscriptionRepository.save(subscription)

		const withTxSpy = vi.spyOn(subscriptionRepository, "withTransaction")
		const withUserTxSpy = vi.spyOn(userRepository, "withTransaction")

		const tx = {}
		const result = await sut.execute(
			{ billingSubscriptionId: "sub_stripe_789" },
			tx,
		)

		expect(result.isSuccess()).toBe(true)
		expect(withTxSpy).toHaveBeenCalledWith(tx)
		expect(withUserTxSpy).toHaveBeenCalledWith(tx)
	})
})
