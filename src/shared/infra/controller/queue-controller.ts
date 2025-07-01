import { inject, injectable } from 'inversify'

import type { CheckInCreatedEvent } from '@/check-in/domain/event/check-in-created-event'
import type { PasswordChangedEvent } from '@/user/domain/event/password-changed-event'
import type { UserCreatedEvent } from '@/user/domain/event/user-created-event'

import type { MailerGateway } from '../gateway/mailer-gateway'
import { SHARED_TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import type { Queue } from '../queue/queue'
import { QUEUES } from '../queue/queues'
import type { Controller } from './controller'

@injectable()
export class QueueController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Queue)
    private readonly queue: Queue,
    @inject(SHARED_TYPES.Mailer)
    private readonly mailer: MailerGateway,
    @inject(SHARED_TYPES.Logger)
    private readonly logger: Logger,
  ) {}

  public async init(): Promise<void> {
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
        this.logger.info(
          this,
          `Password changed event: ${JSON.stringify(event, null, 2)}`,
        )
        const payload = event.payload
        await this.mailer.sendMail(
          payload.email,
          'Password changed',
          'Password changed successfully [Async]',
        )
      },
    )

    this.queue.consume(QUEUES.LOG, async (event: any): Promise<void> => {
      this.logger.info(this, `QUEUE [LOG]: ${JSON.stringify(event, null, 2)}`)
    })

    this.queue.consume(
      QUEUES.CHECK_IN,
      async (event: CheckInCreatedEvent): Promise<void> => {
        this.logger.info(
          this,
          `QUEUE [CHECK_IN]: ${JSON.stringify(event, null, 2)}`,
        )
      },
    )
  }
}
