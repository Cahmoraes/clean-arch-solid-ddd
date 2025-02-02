import { inject, injectable } from 'inversify'

import type { CheckInCreatedEvent } from '@/domain/check-in/event/check-in-created-event'
import type { PasswordChangedEvent } from '@/domain/user/event/password-changed-event'
import type { UserCreatedEvent } from '@/domain/user/event/user-created-event'

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
      async (message: UserCreatedEvent): Promise<void> => {
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
      async (event: PasswordChangedEvent): Promise<void> => {
        console.log('Password changed event', event)
        const payload = event.payload
        await this.mailer.sendMail(
          payload.email,
          'Password changed',
          'Password changed successfully [Async]',
        )
      },
    )

    this.queue.consume(QUEUES.LOG, async (event: any): Promise<void> => {
      console.log('QUEUE [LOG]')
      console.log(event)
    })

    this.queue.consume(
      QUEUES.CHECK_IN,
      async (event: CheckInCreatedEvent): Promise<void> => {
        console.log('QUEUE [CHECK_IN]')
        console.log(event)
      },
    )
  }
}
