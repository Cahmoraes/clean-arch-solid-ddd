import { injectable } from 'inversify'
import Stripe from 'stripe'

import type {
  AttachPaymentMethodInput,
  CreateCustomerInput,
  CreateCustomerResponse,
  CreateSubscriptionInput,
  CreateSubscriptionResponse,
  SubscriptionGateway,
} from '@/subscription/gateway/subscription-gateway'

import { env } from '../env'

@injectable()
export class StripeSubscriptionGateway implements SubscriptionGateway {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(env.STRIPE_PRIVATE_KEY, {
      apiVersion: '2025-06-30.basil', // Versão compatível com biblioteca 18.3.0
      maxNetworkRetries: 3,
      timeout: 10000,
    })
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

  public async attachPaymentMethodToCustomer(
    data: AttachPaymentMethodInput,
  ): Promise<void> {
    // Anexar payment method ao customer
    await this.stripe.paymentMethods.attach(data.paymentMethodId, {
      customer: data.customerId,
    })
    // Definir como payment method padrão para futuras faturas
    await this.stripe.customers.update(data.customerId, {
      invoice_settings: {
        default_payment_method: data.paymentMethodId,
      },
    })
  }

  public async createSubscription(
    data: CreateSubscriptionInput,
  ): Promise<CreateSubscriptionResponse> {
    const subscriptionData = this.buildSubscriptionParams(data)
    const subscriptionResponse =
      await this.stripe.subscriptions.create(subscriptionData)
    return {
      customerId: subscriptionResponse.customer.toString(),
      subscriptionId: subscriptionResponse.id,
      status: subscriptionResponse.status,
    }
  }

  private buildSubscriptionParams(
    data: CreateSubscriptionInput,
  ): Stripe.SubscriptionCreateParams {
    return {
      customer: data.customerId,
      items: [{ price: data.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      metadata: data.metadata ?? {},
      expand: ['latest_invoice.payment_intent'],
      ...(data.paymentMethodId && {
        default_payment_method: data.paymentMethodId,
      }),
    }
  }
}
