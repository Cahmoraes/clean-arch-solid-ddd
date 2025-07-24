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

export interface SubscriptionGateway {
  createCustomer(data: CreateCustomerInput): Promise<CreateCustomerResponse>
}
