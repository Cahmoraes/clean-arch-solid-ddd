import { inject, injectable } from 'inversify'

import { SUBSCRIPTION_TYPES } from '@/shared/infra/ioc/module/service-identifier/subscription-types'
import { USER_TYPES } from '@/shared/infra/ioc/types'
import { UserNotFoundError } from '@/user/application/error/user-not-found-error'
import type { UserRepository } from '@/user/application/repository/user-repository'

import type { SubscriptionGateway } from '../gateway/subscription-gateway'

export interface CreateCustomerInput {
  email: string
  name?: string
  metadata?: Record<string, string>
}

export interface CreateCustomerResponse {
  id: string
  userId: string
  name: string
  email: string
}

@injectable()
export class CreateCustomer {
  constructor(
    @inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
    private readonly subscriptionGateway: SubscriptionGateway,
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: CreateCustomerInput,
  ): Promise<CreateCustomerResponse> {
    const userFound = await this.userRepository.userOfEmail(input.email)
    if (!userFound) throw new UserNotFoundError()
    const customer = await this.subscriptionGateway.createCustomer({
      email: userFound.email,
      name: userFound.name,
      metadata: { userId: userFound.id! },
    })
    void userFound.setBillingCustomerId(customer.id)
    await this.userRepository.update(userFound)
    console.log('*********************** create customer')
    console.log(userFound)
    return {
      id: customer.id,
      userId: userFound.id!,
      name: customer.name,
      email: customer.email,
    }
  }
}
