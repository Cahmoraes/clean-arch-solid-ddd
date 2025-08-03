import { inject, injectable } from 'inversify'

import { DomainEventPublisher } from '@/shared/domain/event/domain-event-publisher'
import type { Controller } from '@/shared/infra/controller/controller'
import { SUBSCRIPTION_TYPES } from '@/shared/infra/ioc/module/service-identifier/subscription-types'
import type { CreateCustomer } from '@/subscription/use-case/create-customer.usecase'
import type { UserCreatedEvent } from '@/user/domain/event/user-created-event'

@injectable()
export class CreateCustomerController implements Controller {
  constructor(
    @inject(SUBSCRIPTION_TYPES.USE_CASES.CreateCustomer)
    private readonly createCustomerUseCase: CreateCustomer,
  ) {}

  public async init(): Promise<void> {
    DomainEventPublisher.instance.subscribe(
      'userCreated',
      async (data: UserCreatedEvent) => {
        console.log('User created event received:', data)
        const { payload } = data
        await this.createCustomerUseCase.execute({
          name: payload.name,
          email: payload.email,
        })
      },
    )
  }
}
