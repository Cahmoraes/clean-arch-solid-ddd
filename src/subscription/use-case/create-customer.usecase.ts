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
    const foundUser = await this.userRepository.userOfEmail(input.email)
    if (!foundUser) throw new UserNotFoundError()
    const customer = await this.subscriptionGateway.createCustomer({
      email: foundUser.email,
      name: foundUser.name,
      metadata: { userId: foundUser.id! },
    })
    void foundUser.setBillingCustomerId(customer.id)
    await this.userRepository.update(foundUser)
    return {
      id: customer.id,
      userId: foundUser.id!,
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
