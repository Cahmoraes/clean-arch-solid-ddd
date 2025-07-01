import { inject, injectable } from 'inversify'

import { SHARED_TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import type { MailerGateway } from './mailer-gateway'

@injectable()
export class MailerGatewayMemory implements MailerGateway {
  constructor(
    @inject(SHARED_TYPES.Logger)
    private readonly logger: Logger,
  ) {}

  public async sendMail(
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    this.logger.info(this, `Sending email to: ${to}`)
    this.logger.info(this, `Subject: ${subject}`)
    this.logger.info(this, `Body:, ${body}`)
  }
}
