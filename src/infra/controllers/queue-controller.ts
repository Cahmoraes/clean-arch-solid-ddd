import { inject, injectable } from 'inversify'

import { EVENTS } from '@/domain/event/events'
import type { UserCreatedEvent } from '@/domain/event/user-created-event'

import type { MailerGateway } from '../gateway/mailer-gateway'
import { TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import type { Queue } from '../queue/queue'

@injectable()
export class QueueController {
  constructor(
    @inject(TYPES.Queue)
    private readonly queue: Queue,
    @inject(TYPES.Mailer)
    private readonly mailer: MailerGateway,
    @inject(TYPES.Logger)
    private readonly logger: Logger,
  ) {
    this.init()
  }

  private async init() {
    this.logger.info(this, '✅')
    this.queue.consume(EVENTS.USER_CREATED, (message: UserCreatedEvent) => {
      console.log('User created event', message)
      const payload = message.payload
      this.mailer.sendMail(
        payload.email,
        'User created',
        'User created successfully [Async]',
      )
    })
  }
}
