import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import type { InMemorySubscriptionRepository } from '@/shared/infra/database/repository/in-memory/in-memory-subscription-repository'
import type { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { env } from '@/shared/infra/env'
import { StripeSubscriptionGateway } from '@/shared/infra/gateway/stripe-subscription-gateway'
import { container } from '@/shared/infra/ioc/container'
import { SUBSCRIPTION_TYPES } from '@/shared/infra/ioc/module/service-identifier/subscription-types'
import { User } from '@/user/domain/user'

import type {
  CreateCustomer,
  CreateCustomerInput,
} from './create-customer.usecase'
import type {
  CreateSubscriptionUseCase,
  CreateSubscriptionUseCaseInput,
} from './create-subscription.usecase'

describe('CreateSubscription UseCase', () => {
  let sut: CreateSubscriptionUseCase
  let createCustomer: CreateCustomer
  let userRepository: InMemoryUserRepository
  let subscriptionGateway: StripeSubscriptionGateway
  let subscriptionRepository: InMemorySubscriptionRepository

  beforeEach(() => {
    container.snapshot()
    const repositories = setupInMemoryRepositories()
    userRepository = repositories.userRepository
    subscriptionRepository = repositories.subscriptionRepository
    subscriptionGateway = new StripeSubscriptionGateway()
    container
      .rebindSync(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
      .toConstantValue(subscriptionGateway)
    createCustomer = container.get(SUBSCRIPTION_TYPES.USE_CASES.CreateCustomer)
    sut = container.get(SUBSCRIPTION_TYPES.USE_CASES.CreateSubscription)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve criar uma Subscription', async () => {
    const randomNumber = Math.floor(Math.random() * 999) + 1
    const user = User.create({
      email: `caique@${randomNumber}moraes.com.br`,
      name: `Caique Moraes-${randomNumber}`,
      password: '123456',
    }).force.success().value
    await userRepository.save(user)
    const userSaved = (await userRepository.userOfEmail(user.email)) as User
    const createCustomerInput: CreateCustomerInput = {
      email: user.email,
      name: user.name,
      metadata: { userId: user.id! },
    }
    const response = await createCustomer.execute(createCustomerInput)
    console.log({ customerResponse: response })
    const createSubscriptionInput: CreateSubscriptionUseCaseInput = {
      userId: userSaved.id!,
      customerId: response.id,
      priceId: env.STRIPE_PRICE_ID,
    }
    await sut.execute(createSubscriptionInput)
    const subscriptionSaved = await subscriptionRepository.ofUserId(
      userSaved.id!,
    )
    expect(subscriptionSaved!.id).toBeDefined()
    expect(subscriptionSaved!.userId).toBe(userSaved.id)
    expect(subscriptionSaved!.billingSubscriptionId).toBe(response.id)
    console.log('Subscription saved:', subscriptionSaved)
  })
})
