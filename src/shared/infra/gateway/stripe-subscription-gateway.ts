import { injectable } from 'inversify'
import Stripe from 'stripe'

import type {
  CreateCustomerInput,
  CreateCustomerResponse,
  SubscriptionGateway,
} from '@/subscription/gateway/subscription-gateway'

import { env } from '../env'

@injectable()
export class StripeSubscriptionGateway implements SubscriptionGateway {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(env.STRIPE_PRIVATE_KEY)
  }

  public async createCustomer(
    data: CreateCustomerInput,
  ): Promise<CreateCustomerResponse> {
    const response = await this.stripe.customers.create(data)
    return {
      name: response.name!,
      email: response.email!,
      created: response.created,
      id: response.id,
      metadata: response.metadata,
      object: response.object,
    }
  }
}
