import type { SubscriptionStatusTypes } from './subscription-status-types'

export interface SubscriptionConstructor {
  id: string
  userId: string
  billingSubscriptionId: string
  status: SubscriptionStatusTypes
  createdAt: Date
}

export interface SubscriptionCreate {
  id: string
  userId: string
  billingSubscriptionId: string
  status: SubscriptionStatusTypes
}

export class Subscription {
  private readonly _id: string
  private readonly _userId: string
  private readonly _billingSubscriptionId: string
  private _status: SubscriptionStatusTypes
  private readonly _createdAt: Date
  private _updatedAt?: Date
  private _canceledAt?: Date

  private constructor(props: SubscriptionConstructor) {
    this._id = props.id
    this._userId = props.userId
    this._billingSubscriptionId = props.billingSubscriptionId
    this._status = props.status
    this._createdAt = props.createdAt
  }

  public static create(props: SubscriptionCreate): Subscription {
    const createdAt = new Date()
    return new Subscription({
      ...props,
      createdAt,
    })
  }

  public get id(): string {
    return this._id
  }

  public get userId(): string {
    return this._userId
  }

  public get billingSubscriptionId(): string {
    return this._billingSubscriptionId
  }

  public get status(): SubscriptionStatusTypes {
    return this._status
  }

  public get createdAt(): Date {
    return this._createdAt
  }

  public get updatedAt(): Date | undefined {
    return this._updatedAt
  }

  public get canceledAt(): Date | undefined {
    return this._canceledAt
  }

  public changeStatus(newStatus: SubscriptionStatusTypes): void {
    this._status = newStatus
  }

  public activate(): void {
    this._status = 'active'
    this._updatedAt = new Date()
  }

  public cancel(): void {
    this._status = 'canceled'
    this._canceledAt = new Date()
    this._updatedAt = new Date()
  }
}
