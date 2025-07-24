import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type {
  CreateCustomerInput,
  CreateCustomerResponse,
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
      id: `cus_test_${this.customerIdCounter.toString().padStart(10, '0')}`,
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

  public getCustomersCount(): number {
    return this._customers.size
  }
}
