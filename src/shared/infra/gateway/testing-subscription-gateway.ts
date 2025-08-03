/* eslint-disable @typescript-eslint/no-unused-vars */
import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'
import type Stripe from 'stripe'

import type {
  AttachPaymentMethodInput,
  CreateCustomerInput,
  CreateCustomerResponse,
  CreateSubscriptionInput,
  CreateSubscriptionResponse,
  SubscriptionGateway,
} from '@/subscription/gateway/subscription-gateway'

@injectable()
export class TestingSubscriptionGateway implements SubscriptionGateway {
  private _customers: ExtendedSet<CreateCustomerResponse> = new ExtendedSet()
  private customerIdCounter = 1

  public async createCustomer(
    data: CreateCustomerInput,
  ): Promise<CreateCustomerResponse> {
    const customer: CreateCustomerResponse = {
      id: `cus_test_${Math.random() + this.customerIdCounter.toString().padStart(10, '0')}`,
      object: 'customer',
      email: data.email,
      name: data.name ?? '',
      metadata: data.metadata ?? {},
      created: Math.floor(Date.now() / 1000),
    }
    this._customers.add(customer)
    this.customerIdCounter++
    return customer
  }

  public get customers(): CreateCustomerResponse[] {
    return [...this._customers]
  }

  public customerById(id: string): CreateCustomerResponse | null {
    return this._customers.find((customer) => customer.id === id)
  }

  public customerByEmail(email: string): CreateCustomerResponse | null {
    return this._customers.find((customer) => customer.email === email)
  }

  public clearCustomers(): void {
    this._customers.clear()
    this.customerIdCounter = 1
  }

  public get customersCount(): number {
    return this._customers.size
  }

  public async attachPaymentMethodToCustomer(
    data: AttachPaymentMethodInput,
  ): Promise<void> {
    console.log(
      `Attaching payment method ${data.paymentMethodId} to customer ${data.customerId}`,
    )
  }

  public async createSubscription(
    data: CreateSubscriptionInput,
  ): Promise<CreateSubscriptionResponse> {
    return {
      subscriptionId: `sub_test_${Math.random().toString(36).substring(2, 15)}`,
      customerId: data.customerId,
      status: 'active',
    }
  }

  public async createPaymentMethod(): Promise<string> {
    return 'fake-payment-method-id'
  }

  public async createEventWebhook(
    _rawBody: string | Buffer,
    _signature: string,
  ): Promise<Stripe.Event> {
    return {} as unknown as any
  }
}
