import { inject, injectable } from 'inversify'

import type { PasswordChangedEvent } from '@/domain/event/password-changed-event'
import type { UserCreatedEvent } from '@/domain/event/user-created-event'

import type { MailerGateway } from '../gateway/mailer-gateway'
import { TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import type { Queue } from '../queue/queue'
import { QUEUES } from '../queue/queues'

@injectable()
export class QueueController {
  constructor(
    @inject(TYPES.Queue)
    private readonly queue: Queue,
    @inject(TYPES.Mailer)
    private readonly mailer: MailerGateway,
    @inject(TYPES.Logger)
    private readonly logger: Logger,
  ) {}

  public async init() {
    this.logger.info(this, '✅')
    this.queue.consume(
      QUEUES.SEND_WELCOME_EMAIL,
      async (message: UserCreatedEvent) => {
        // console.log('User created event', message)
        const payload = message.payload
        await this.mailer.sendMail(
          payload.email,
          'User created',
          'User created successfully [Async]',
        )
      },
    )

    this.queue.consume(
      QUEUES.NOTIFY_PASSWORD_CHANGED,
      async (message: PasswordChangedEvent) => {
        console.log('Password changed event', message)
        const payload = message.payload
        await this.mailer.sendMail(
          payload.email,
          'Password changed',
          'Password changed successfully [Async]',
        )
      },
    )

    this.queue.consume(QUEUES.LOG, async (event: any) => {
      console.log('QUEUE [LOG]')
      console.log(event)
    })
  }
}
