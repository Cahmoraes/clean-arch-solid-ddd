import { inject, injectable } from 'inversify'

import { DomainEventPublisher } from '@/shared/domain/event/domain-event-publisher'
import { SUBSCRIPTION_TYPES } from '@/shared/infra/ioc/module/service-identifier/subscription-types'
import { SHARED_TYPES, USER_TYPES } from '@/shared/infra/ioc/types'
import type { Logger } from '@/shared/infra/logger/logger'
import { UserNotFoundError } from '@/user/application/error/user-not-found-error'
import type { UserRepository } from '@/user/application/repository/user-repository'
import type { UserCreatedEvent } from '@/user/domain/event/user-created-event'

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
    @inject(SHARED_TYPES.Logger)
    private readonly logger: Logger,
  ) {
    void this.bindMethod()
    void this.registerUserCreatedEventListener()
  }

  private bindMethod(): void {
    this.createDomainEventSubscriber =
      this.createDomainEventSubscriber.bind(this)
  }

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

  private registerUserCreatedEventListener(): void {
    DomainEventPublisher.instance.subscribe(
      'userCreated',
      this.createDomainEventSubscriber,
    )
  }

  private async createDomainEventSubscriber(
    event: UserCreatedEvent,
  ): Promise<void> {
    this.logger.info(this, { event })
    await this.execute(event.payload)
  }
}
