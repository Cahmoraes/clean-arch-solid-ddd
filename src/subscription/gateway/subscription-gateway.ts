import type { SubscriptionStatusTypes } from '../domain/subscription-status-types'

export interface CreateCustomerInput {
  email: string
  name?: string
  metadata?: Record<string, string>
}

export interface CreateCustomerResponse {
  id: string
  object: string
  email: string
  metadata: Record<string, string>
  name: string
  created: number
}

export interface AttachPaymentMethodInput {
  customerId: string
  paymentMethodId: string
}

export interface CreateSubscriptionInput {
  customerId: string
  priceId: string
  paymentMethodId?: string
  metadata?: Record<string, string>
}

export interface CreateSubscriptionResponse {
  subscriptionId: string
  customerId: string
  status: SubscriptionStatusTypes
}

export interface SubscriptionGateway {
  createCustomer(data: CreateCustomerInput): Promise<CreateCustomerResponse>
  attachPaymentMethodToCustomer(data: AttachPaymentMethodInput): Promise<void>
  createSubscription(
    data: CreateSubscriptionInput,
  ): Promise<CreateSubscriptionResponse>
  createPaymentMethod(): Promise<string>
}
