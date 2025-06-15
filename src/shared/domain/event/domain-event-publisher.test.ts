import { PasswordChangedEvent } from '@/user/domain/event/password-changed-event'
import { UserCreatedEvent } from '@/user/domain/event/user-created-event'
import { DomainEventPublisher } from './domain-event-publisher'

describe('DomainEventPublisher', () => {
  beforeEach(() => {
    DomainEventPublisher.instance['subscribers'].clear()
  })

  test('Deve publicar um event', () => {
    const event = new UserCreatedEvent({
      email: 'user@mail.com',
      name: 'john doe',
    })
    const subscriber = vi.fn()
    DomainEventPublisher.instance.subscribe('userCreated', subscriber)
    DomainEventPublisher.instance.publish(event)
    expect(subscriber).toHaveBeenCalledWith(event)
  })

  test('Deve desinscrever um subscriber', () => {
    const subscriber = vi.fn()
    DomainEventPublisher.instance.subscribe('userCreated', subscriber)
    DomainEventPublisher.instance.unsubscribe('userCreated', subscriber)
  })

  test('Deve notificar um subscriber por tópico', () => {
    const userCreatedEvent = new UserCreatedEvent({
      email: 'user@mail.com',
      name: 'john doe',
    })
    const passwordChangedEvent = new PasswordChangedEvent({
      email: 'user@mail.com',
      name: 'john doe',
    })
    const subscriber1 = vi.fn()
    const subscriber2 = vi.fn()
    DomainEventPublisher.instance.subscribe('userCreated', subscriber1)
    DomainEventPublisher.instance.subscribe('passwordChanged', subscriber2)
    expect(DomainEventPublisher.instance['subscribers'].size).toBe(2)
    DomainEventPublisher.instance.publish(userCreatedEvent)
    DomainEventPublisher.instance.publish(passwordChangedEvent)
    expect(subscriber1).toHaveBeenCalledWith(userCreatedEvent)
    expect(subscriber1).toHaveBeenCalledTimes(1)
    expect(subscriber1).not.toHaveBeenCalledWith(passwordChangedEvent)

    expect(subscriber2).toHaveBeenCalledWith(passwordChangedEvent)
    expect(subscriber2).toHaveBeenCalledTimes(1)
    expect(subscriber2).not.toHaveBeenCalledWith(userCreatedEvent)
  })
})
